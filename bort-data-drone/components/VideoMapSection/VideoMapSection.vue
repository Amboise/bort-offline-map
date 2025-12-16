<template>
  <div class="video-section">
    <div class="video-section__content">
      <div v-if="!isConnected" class="video-section__header">
        <h2 class="video-section__title">Видео</h2>
        <button 
          @click="connectToStream" 
          :disabled="isConnecting"
          class="video-section__connect-btn"
        >
          <span v-if="isConnecting">Подключение...</span>
          <span v-else>Подключиться</span>
        </button>
      </div>
      
      <div v-if="isConnected" class="video-section__header">
        <h2 class="video-section__title">🟢 Трансляция активна</h2>
      </div>

      <!-- HTML5 Video для отображения HLS потока -->
      <div class="video-section__player">
        <video 
          ref="videoPlayer" 
          class="video-section__video"
          v-show="isConnected"
          controls
          muted
          playsinline
          preload="none"
        >
          <p>Ваш браузер не поддерживает HTML5 видео</p>
        </video>
        
        <!-- Плейсхолдер когда нет видео -->
        <div v-if="!isConnected" class="video-section__placeholder">
          <div class="video-section__placeholder-content">
            <p class="video-section__placeholder-text">
              Нажмите "Подключиться" для запуска видео трансляции
            </p>
            <small class="video-section__placeholder-hint">
              Убедитесь что RTSP поток запущен
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Состояние компонента
const isConnected = ref(false)
const isConnecting = ref(false)
const statusMessage = ref('')
const videoPlayer = ref(null)
const selectedQuality = ref('MEDIUM_QUALITY')
const audioEnabled = ref(true)

// HLS плеер
let hls = null

// URL HLS плейлиста - автоопределение хоста
const getHLSURL = () => {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:8081/hls/stream.m3u8`
}
const HLS_URL = getHLSURL()

// Функция подключения к видео потоку
const connectToStream = async () => {
  if (isConnecting.value || isConnected.value) return
  
  isConnecting.value = true
  statusMessage.value = 'Подключаемся к серверу...'
  
  try {
    // Проверяем доступность сервера и HLS потока
    const apiURL = `${window.location.protocol}//${window.location.hostname}:8081/api/status`
    const response = await fetch(apiURL)
    if (!response.ok) {
      throw new Error('Сервер не доступен')
    }
    
    const serverStatus = await response.json()
    
    if (!videoPlayer.value) {
      throw new Error('Video элемент не найден')
    }
    
    // Загружаем HLS.js динамически через CDN
    if (!window.Hls) {
      statusMessage.value = 'Загружаем HLS плеер...'
      await loadHlsJs()
    }
    
    // Настраиваем управление звуком
    videoPlayer.value.muted = !audioEnabled.value
    videoPlayer.value.volume = audioEnabled.value ? 1.0 : 0.0
    
    if (window.Hls.isSupported()) {
      // Создаем HLS плеер
      hls = new window.Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        liveDurationInfinity: true
      })
      
      // Обработчики событий HLS
      hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
        statusMessage.value = 'Ожидаем HLS поток...'
      })
      
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        statusMessage.value = 'HLS плейлист загружен'
        videoPlayer.value.play().catch(err => {
          console.warn('Автовоспроизведение заблокировано:', err)
          statusMessage.value = 'Нажмите ▶️ для воспроизведения'
        })
      })
      
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        console.error('HLS ошибка:', data)
        if (data.fatal) {
          switch (data.type) {
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              statusMessage.value = 'Ошибка сети. Переподключение...'
              setTimeout(() => {
                hls.startLoad()
              }, 3000)
              break
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              statusMessage.value = 'Ошибка декодирования. Восстановление...'
              hls.recoverMediaError()
              break
            default:
              handleConnectionError('Критическая ошибка HLS')
              break
          }
        }
      })
      
      // Подключаем к video элементу и загружаем поток
      hls.attachMedia(videoPlayer.value)
      hls.loadSource(HLS_URL)
      
    } else if (videoPlayer.value.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari поддерживает HLS нативно
      statusMessage.value = 'Используем нативную поддержку HLS...'
      videoPlayer.value.src = HLS_URL
      videoPlayer.value.play().catch(err => {
        console.warn('Автовоспроизведение заблокировано:', err)
        statusMessage.value = 'Нажмите ▶️ для воспроизведения'
      })
    } else {
      throw new Error('HLS не поддерживается браузером')
    }
    
    // Обработчики событий HTML5 video
    videoPlayer.value.addEventListener('loadstart', () => {
      statusMessage.value = 'Загружаем видео...'
    })
    
    videoPlayer.value.addEventListener('loadeddata', () => {
      statusMessage.value = 'Видео загружено'
    })
    
    videoPlayer.value.addEventListener('playing', () => {
      isConnected.value = true
      isConnecting.value = false
      statusMessage.value = '🟢 Трансляция активна'
    })
    
    videoPlayer.value.addEventListener('waiting', () => {
      statusMessage.value = 'Буферизация...'
    })
    
    videoPlayer.value.addEventListener('error', () => {
      handleConnectionError('Ошибка воспроизведения видео')
    })
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error)
    handleConnectionError(`Ошибка подключения: ${error.message}`)
  }
}

// Функция загрузки HLS.js через CDN
const loadHlsJs = () => {
  return new Promise((resolve, reject) => {
    if (window.Hls) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Не удалось загрузить HLS.js'))
    document.head.appendChild(script)
  })
}

// Функция отключения от потока
const disconnectFromStream = () => {
  if (hls) {
    try {
      hls.destroy()
    } catch (error) {
      console.error('⚠️ Ошибка при остановке HLS:', error)
    }
    hls = null
  }
  
  if (videoPlayer.value) {
    try {
      videoPlayer.value.pause()
      videoPlayer.value.src = ''
      videoPlayer.value.load() // Сбрасываем состояние видео
    } catch (error) {
      console.error('⚠️ Ошибка при остановке видео:', error)
    }
  }
  
  isConnected.value = false
  isConnecting.value = false
  statusMessage.value = 'Трансляция остановлена'
}

// Функция смены качества видео
const changeQuality = async () => {
  if (!isConnected.value) return
  
  try {
    const apiURL = `${window.location.protocol}//${window.location.hostname}:8081/api/quality/${selectedQuality.value}`
    const response = await fetch(apiURL, { method: 'POST' })
    
    if (response.ok) {
      statusMessage.value = `Переключение на ${getQualityName(selectedQuality.value)}...`
    } else {
      throw new Error('Ошибка смены качества')
    }
  } catch (error) {
    console.error('Ошибка смены качества:', error)
    statusMessage.value = 'Ошибка смены качества'
  }
}

// Получить читаемое название качества
const getQualityName = (quality) => {
  const names = {
    'HIGH_QUALITY': 'высокое качество',
    'MEDIUM_QUALITY': 'среднее качество', 
    'LOW_QUALITY': 'низкое качество',
    'MOBILE': 'мобильное качество'
  }
  return names[quality] || quality
}

// Функция переключения звука
const toggleAudio = async () => {
  audioEnabled.value = !audioEnabled.value
  
  if (videoPlayer.value) {
    try {
      // HTML5 video API для управления звуком
      videoPlayer.value.muted = !audioEnabled.value
      videoPlayer.value.volume = audioEnabled.value ? 1.0 : 0.0
      statusMessage.value = `Звук ${audioEnabled.value ? 'включен' : 'выключен'}`
    } catch (error) {
      console.error('Ошибка управления звуком:', error)
      statusMessage.value = `Ошибка управления звуком`
    }
  }
  
  // Сохраняем настройку в localStorage
  localStorage.setItem('rtsp-audio-enabled', audioEnabled.value.toString())
}

// Обработка ошибок соединения
const handleConnectionError = (message) => {
  isConnected.value = false
  isConnecting.value = false
  statusMessage.value = message
  
  if (player) {
    try {
      if (typeof player.destroy === 'function') {
        player.destroy()
      } else if (typeof player.stop === 'function') {
        player.stop()
      }
    } catch (error) {
      console.error('⚠️ Ошибка при остановке плеера в handleConnectionError:', error)
    }
    player = null
  }
  
  if (websocket) {
    try {
      websocket.close()
    } catch (error) {
      console.error('⚠️ Ошибка при закрытии WebSocket в handleConnectionError:', error)
    }
    websocket = null
  }
}

// Очистка ресурсов при размонтировании компонента
onUnmounted(() => {
  disconnectFromStream()
})

// Инициализация при монтировании
onMounted(() => {
  statusMessage.value = 'Готов к подключению'
  
  // Восстанавливаем настройку звука из localStorage
  const savedAudioEnabled = localStorage.getItem('rtsp-audio-enabled')
  if (savedAudioEnabled !== null) {
    audioEnabled.value = savedAudioEnabled === 'true'
  }
})
</script>

<style scoped>
@import './VideoMapSection.scss';
</style>
