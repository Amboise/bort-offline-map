import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';
import { createServer } from 'http';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';

const app = express();
const server = createServer(app);

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://10.20.225.46:3000',
    // Разрешаем все адреса в локальной сети
    /^http:\/\/192\.168\.\d+\.\d+:3000$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
    /^http:\/\/172\.16\.\d+\.\d+:3000$/
  ],
  credentials: true
}));

// Создаем директорию для HLS файлов
const hlsDir = path.join(process.cwd(), 'hls');
if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir, { recursive: true });
}

// Serve static HLS files
app.use('/hls', express.static(hlsDir));

let ffmpegProcess = null;
let currentQualityProfile = process.env.QUALITY_PROFILE || 'MEDIUM_QUALITY';

// Функция для получения HLS аргументов FFmpeg
function getHLSArgs(profile = 'MEDIUM_QUALITY') {
  const profileSettings = {
    HIGH_QUALITY: { videoBitrate: '2000k', audioBitrate: '128k', fps: 30, scale: '1280:720' },
    MEDIUM_QUALITY: { videoBitrate: '1000k', audioBitrate: '96k', fps: 25, scale: '854:480' },
    LOW_QUALITY: { videoBitrate: '500k', audioBitrate: '64k', fps: 20, scale: '640:360' },
    MOBILE: { videoBitrate: '300k', audioBitrate: '48k', fps: 15, scale: '480:270' }
  };
  
  const config = profileSettings[profile];
  const playlistPath = path.join(hlsDir, 'stream.m3u8');
  const segmentPath = path.join(hlsDir, 'segment_%03d.ts');
  
  return [
    '-i', 'rtsp://localhost:5544/',
    '-rtsp_transport', 'tcp',
    
    // Видео настройки
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency', 
    '-profile:v', 'baseline',
    '-level', '3.0',
    '-b:v', config.videoBitrate,
    '-maxrate', config.videoBitrate,
    '-bufsize', `${parseInt(config.videoBitrate) * 2}k`,
    '-r', config.fps.toString(),
    '-g', (config.fps * 2).toString(), // GOP size
    '-keyint_min', config.fps.toString(),
    '-sc_threshold', '0',
    '-vf', `scale=${config.scale}:force_original_aspect_ratio=decrease,pad=${config.scale}:(ow-iw)/2:(oh-ih)/2:black`,
    
    // Аудио настройки
    '-c:a', 'aac',
    '-b:a', config.audioBitrate,
    '-ar', '44100',
    '-ac', '2',
    '-af', 'volume=1.0',
    
    // HLS настройки
    '-f', 'hls',
    '-hls_time', '2',           // 2 секунды на сегмент (низкая задержка)
    '-hls_list_size', '10',     // Держим 10 сегментов в плейлисте
    '-hls_flags', 'delete_segments+append_list+omit_endlist',
    '-hls_segment_filename', segmentPath,
    '-y',                       // Перезаписывать файлы
    playlistPath
  ];
}

// Функция для запуска FFmpeg процесса
function startFFmpeg() {
  if (ffmpegProcess) return;
  
  console.log(`🎥 Запускаем FFmpeg HLS (профиль: ${currentQualityProfile})...`);
  
  // Очищаем старые HLS файлы
  try {
    const files = fs.readdirSync(hlsDir);
    files.forEach(file => {
      if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
        fs.unlinkSync(path.join(hlsDir, file));
      }
    });
  } catch (err) {
    console.log('Ошибка очистки HLS файлов:', err.message);
  }
  
  // Получаем аргументы FFmpeg для HLS
  const ffmpegArgs = getHLSArgs(currentQualityProfile);
  ffmpegProcess = spawn(ffmpeg.path, ffmpegArgs);

  // Обработка ошибок FFmpeg (показываем только критичные)
  ffmpegProcess.stderr.on('data', (data) => {
    const message = data.toString();
    if (message.includes('error') || message.includes('Error') || message.includes('Opening')) {
      console.log('FFmpeg:', message.trim());
    }
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg процесс завершился с кодом ${code}`);
    ffmpegProcess = null;
    
    // Автоматическое переподключение через 3 секунды
    setTimeout(startFFmpeg, 3000);
  });

  ffmpegProcess.on('error', (err) => {
    console.error('Ошибка FFmpeg:', err);
    ffmpegProcess = null;
  });
}

// Функция остановки FFmpeg
function stopFFmpeg() {
  if (ffmpegProcess) {
    console.log('⏹️ Останавливаем FFmpeg...');
    ffmpegProcess.kill('SIGTERM');
    ffmpegProcess = null;
  }
}

// Автозапуск FFmpeg при старте сервера
startFFmpeg();

// API endpoint для проверки статуса
app.get('/api/status', (req, res) => {
  // Проверяем существует ли HLS плейлист
  const hlsPlaylistExists = fs.existsSync(path.join(hlsDir, 'stream.m3u8'));
  
  res.json({
    status: 'running',
    ffmpeg: ffmpegProcess ? 'running' : 'stopped',
    qualityProfile: currentQualityProfile,
    hlsReady: hlsPlaylistExists,
    hlsUrl: hlsPlaylistExists ? `/hls/stream.m3u8` : null,
    ffmpegPath: ffmpeg.path
  });
});

// Endpoint для информации о потоке
app.get('/api/stream-info', (req, res) => {
  const hlsPlaylistExists = fs.existsSync(path.join(hlsDir, 'stream.m3u8'));
  
  res.json({
    rtspSource: 'rtsp://localhost:5544/',
    hlsUrl: hlsPlaylistExists ? `/hls/stream.m3u8` : null,
    format: 'HLS',
    videoCodec: 'H.264',
    audioCodec: 'AAC',
    qualityProfile: currentQualityProfile,
    ready: hlsPlaylistExists
  });
});

// Endpoint для смены профиля качества
app.post('/api/quality/:profile', (req, res) => {
  const { profile } = req.params;
  const validProfiles = ['HIGH_QUALITY', 'MEDIUM_QUALITY', 'LOW_QUALITY', 'MOBILE'];
  
  if (!validProfiles.includes(profile)) {
    return res.status(400).json({
      error: 'Invalid quality profile',
      validProfiles
    });
  }
  
  const oldProfile = currentQualityProfile;
  currentQualityProfile = profile;
  
  console.log(`🔄 Переключение профиля качества: ${oldProfile} → ${profile}`);
  
  // Если FFmpeg запущен, перезапускаем с новым профилем
  if (ffmpegProcess) {
    stopFFmpeg();
    setTimeout(() => startFFmpeg(), 1000); // Небольшая пауза перед перезапуском
  }
  
  res.json({
    message: 'Quality profile changed',
    oldProfile,
    newProfile: profile,
    restart: ffmpegProcess ? true : false
  });
});

// Запуск сервера
const PORT = process.env.PORT || 8081;
const HOST = process.env.HOST || '0.0.0.0'; // Слушаем на всех интерфейсах
server.listen(PORT, HOST, () => {
  console.log(`🚀 RTSP-HLS сервер запущен на ${HOST}:${PORT}`);
  console.log(`📺 HLS плейлист: http://localhost:${PORT}/hls/stream.m3u8`);
  console.log(`🔗 API статус: http://localhost:${PORT}/api/status`);
  console.log(`📡 Ожидаем RTSP поток с: rtsp://localhost:5544/`);
  console.log(`🎬 Формат: H.264/AAC → HLS (для HTML5 video)`);
});

// Корректное завершение работы
const shutdown = () => {
  stopFFmpeg();
  server.close(() => {
    console.log('✅ RTSP сервер остановлен');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
