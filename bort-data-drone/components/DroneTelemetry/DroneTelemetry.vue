<template>
  <div class="drone-telemetry">
    <div class="drone-telemetry__header">
      <h3 class="drone-telemetry__title">🚁 Телеметрия дрона</h3>
      <div class="drone-telemetry__status" :class="statusClass">
        {{ connectionStatus }}
      </div>
    </div>
    
    <div class="drone-telemetry__content">
      <!-- Статус подключения -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">📡 Подключение</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Статус:</span>
            <span class="telemetry-item__value" :class="droneData.isConnected ? 'connected' : 'disconnected'">
              {{ droneData.isConnected ? 'Подключен' : 'Отключен' }}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Пакетов:</span>
            <span class="telemetry-item__value">{{ stats.receivedPackets || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- GPS данные -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🛰️ GPS</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Широта:</span>
            <span class="telemetry-item__value">{{ droneData.gps?.lat?.toFixed(7) || '0.0000000' }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Долгота:</span>
            <span class="telemetry-item__value">{{ droneData.gps?.lon?.toFixed(7) || '0.0000000' }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Высота:</span>
            <span class="telemetry-item__value">{{ droneData.gps?.alt?.toFixed(1) || '0.0' }}м</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Спутники:</span>
            <span class="telemetry-item__value">{{ droneData.gps?.satellitesVisible || 0 }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">GPS Fix:</span>
            <span class="telemetry-item__value" :class="gpsFixClass">{{ gpsFixText }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">HDOP:</span>
            <span class="telemetry-item__value">{{ droneData.gps?.hdop?.toFixed(1) || '0.0' }}</span>
          </div>
        </div>
      </div>

      <!-- Ориентация -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🧭 Ориентация</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Крен (Roll):</span>
            <span class="telemetry-item__value">{{ droneData.attitude?.roll?.toFixed(1) || '0.0' }}°</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Тангаж (Pitch):</span>
            <span class="telemetry-item__value">{{ droneData.attitude?.pitch?.toFixed(1) || '0.0' }}°</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Рыскание (Yaw):</span>
            <span class="telemetry-item__value">{{ droneData.attitude?.yaw?.toFixed(1) || '0.0' }}°</span>
          </div>
        </div>
      </div>

      <!-- Скорость и движение -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🏃 Скорость</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Наземная:</span>
            <span class="telemetry-item__value">{{ droneData.velocity?.groundSpeed?.toFixed(1) || '0.0' }} м/с</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Воздушная:</span>
            <span class="telemetry-item__value">{{ droneData.velocity?.airSpeed?.toFixed(1) || '0.0' }} м/с</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Вертикальная:</span>
            <span class="telemetry-item__value">{{ droneData.velocity?.verticalSpeed?.toFixed(1) || '0.0' }} м/с</span>
          </div>
        </div>
      </div>

      <!-- Батарея -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🔋 Батарея</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Напряжение:</span>
            <span class="telemetry-item__value" :class="batteryVoltageClass">
              {{ droneData.battery?.voltage?.toFixed(2) || '0.00' }}В
            </span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Ток:</span>
            <span class="telemetry-item__value">{{ droneData.battery?.current?.toFixed(1) || '0.0' }}А</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Заряд:</span>
            <span class="telemetry-item__value" :class="batteryLevelClass">
              {{ droneData.battery?.remaining || 0 }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Система -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">⚙️ Система</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Режим:</span>
            <span class="telemetry-item__value">{{ droneData.system?.mode || 'UNKNOWN' }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Статус:</span>
            <span class="telemetry-item__value">{{ droneData.system?.status || 'UNKNOWN' }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Двигатель:</span>
            <span class="telemetry-item__value" :class="droneData.system?.armed ? 'armed' : 'disarmed'">
              {{ droneData.system?.armed ? '✅ включен' : '❌ выключен' }}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">MAVLink:</span>
            <span class="telemetry-item__value">v{{ droneData.system?.mavlinkVersion || 0 }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">System ID:</span>
            <span class="telemetry-item__value">{{ droneData.system?.systemId || 0 }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Component ID:</span>
            <span class="telemetry-item__value">{{ droneData.system?.componentId || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Управление -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🎮 Управление</h4>
        <div class="telemetry-controls">
          <button 
            @click="sendCommand('START_UDP')" 
            :disabled="!websocket || connectionStatus === 'Подключен'"
            class="telemetry-button telemetry-button--start"
          >
            Запустить сервер
          </button>
          <button 
            @click="sendCommand('STOP_UDP')" 
            :disabled="!websocket || connectionStatus === 'Отключен'"
            class="telemetry-button telemetry-button--stop"
          >
            Остановить сервер
          </button>
          <button 
            @click="sendCommand('HEARTBEAT')" 
            :disabled="!websocket"
            class="telemetry-button telemetry-button--heartbeat"
          >
            💗 Heartbeat
          </button>
          <button 
            @click="sendCommand('REQUEST_DATA_STREAM')" 
            :disabled="!websocket"
            class="telemetry-button telemetry-button--request"
          >
            📡 Запрос данных
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Реактивные данные
const websocket = ref(null)
const connectionStatus = ref('Отключен')
const droneData = ref({
  isConnected: false,
  lastUpdate: 0,
  gps: {
    lat: 0,
    lon: 0,
    alt: 0,
    satellitesVisible: 0,
    fix: 0,
    hdop: 0
  },
  attitude: {
    roll: 0,
    pitch: 0,
    yaw: 0
  },
  velocity: {
    groundSpeed: 0,
    airSpeed: 0,
    verticalSpeed: 0
  },
  battery: {
    voltage: 0,
    current: 0,
    remaining: 0
  },
  system: {
    mode: 'UNKNOWN',
    armed: false,
    systemId: 0,
    componentId: 0,
    mavlinkVersion: 0,
    status: 'UNKNOWN'
  },
  rc: {
    rssi: 0,
    channels: []
  }
})

const stats = ref({
  receivedPackets: 0,
  timeSinceLastPacket: 0,
  isActive: false,
  droneConnected: false
})

// Вычисляемые свойства для стилизации
const statusClass = computed(() => ({
  'drone-telemetry__status--connected': connectionStatus.value === 'Подключен',
  'drone-telemetry__status--disconnected': connectionStatus.value === 'Отключен'
}))

const gpsFixClass = computed(() => {
  const fix = droneData.value.gps?.fix || 0
  return {
    'gps-fix--no-fix': fix <= 1,
    'gps-fix--2d': fix === 2,
    'gps-fix--3d': fix >= 3
  }
})

const gpsFixText = computed(() => {
  const fix = droneData.value.gps?.fix || 0
  const fixTexts = ['No GPS', 'No Fix', '2D Fix', '3D Fix']
  return fixTexts[fix] || 'Unknown'
})

const batteryVoltageClass = computed(() => {
  const voltage = droneData.value.battery?.voltage || 0
  return {
    'battery-critical': voltage < 3.3,
    'battery-low': voltage >= 3.3 && voltage < 3.7,
    'battery-good': voltage >= 3.7
  }
})

const batteryLevelClass = computed(() => {
  const level = droneData.value.battery?.remaining || 0
  return {
    'battery-critical': level < 20,
    'battery-low': level >= 20 && level < 50,
    'battery-good': level >= 50
  }
})

// WebSocket подключение
const connectWebSocket = () => {
  try {
    websocket.value = new WebSocket('ws://localhost:8080')
    
    websocket.value.onopen = () => {
      connectionStatus.value = 'Подключен'
    }
    
    websocket.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      } catch (error) {
        console.error('❌ Ошибка парсинга WebSocket сообщения:', error)
      }
    }
    
    websocket.value.onclose = () => {
      connectionStatus.value = 'Отключен'
      // Переподключение через 3 секунды
      setTimeout(connectWebSocket, 3000)
    }
    
    websocket.value.onerror = (error) => {
      console.error('❌ WebSocket ошибка:', error)
      connectionStatus.value = 'Ошибка'
    }
  } catch (error) {
    console.error('❌ Ошибка создания WebSocket:', error)
    connectionStatus.value = 'Ошибка'
    // Переподключение через 5 секунд
    setTimeout(connectWebSocket, 5000)
  }
}

// Обработка сообщений от WebSocket
const handleWebSocketMessage = (message) => {
  switch (message.type) {
    case 'telemetry':
      droneData.value = { ...droneData.value, ...message.data }
      break
    
    case 'stats':
      stats.value = { ...stats.value, ...message }
      break
    
    case 'connection':
      break
    
    case 'info':
      break
    
    case 'error':
      console.error(`❌ Ошибка: ${message.message}`)
      break
    
    default:
  }
}

// Отправка команды на сервер
const sendCommand = (command) => {
  if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
    websocket.value.send(command)
  } else {
    console.error('❌ WebSocket не подключен')
  }
}

// Lifecycle hooks
onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  if (websocket.value) {
    websocket.value.close()
  }
})
</script>

<style scoped>
@import './DroneTelemetry.scss';
</style>
