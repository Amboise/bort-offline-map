<template>
  <div class="flight-plan-modal">
    <div class="flight-plan-modal__content">
      <!-- Управление двигателями -->
      <div class="flight-plan-section">
        <h4 class="flight-plan-section__title">⚙️ Управление двигателями</h4>
        <div class="flight-plan-modal__arm-controls">
          <button 
            @click="sendArmCommand"
            class="flight-plan-modal__arm-button flight-plan-modal__arm-button--arm"
          >
            <span class="flight-plan-modal__arm-icon">✅</span>
            ARM
          </button>
          <button 
            @click="sendDisarmCommand"
            class="flight-plan-modal__arm-button flight-plan-modal__arm-button--disarm"
          >
            <span class="flight-plan-modal__arm-icon">❌</span>
            DISARM
          </button>
        </div>
      </div>

      <!-- Создание полетного плана -->
      <div class="flight-plan-section">
        <h4 class="flight-plan-section__title">🗺️ Создание полетного плана</h4>
        <div class="mission-creation">
          <!-- Режим планирования -->
          <div class="planning-mode-controls">
            <button 
              @click="togglePlanningMode"
              :disabled="!isMissionSystemReady"
              :class="[
                'planning-mode-toggle',
                { 
                  'planning-mode-toggle--active': missionMethods?.planningMode?.value,
                  'planning-mode-toggle--disabled': !isMissionSystemReady
                }
              ]"
            >
              <span v-if="!isMissionSystemReady">⏳</span>
              <span v-else-if="missionMethods?.planningMode?.value">🎯</span>
              <span v-else>🗺️</span>
              {{ !isMissionSystemReady 
                ? 'Загрузка системы планирования...' 
                : missionMethods?.planningMode?.value 
                  ? 'Режим планирования: ВКЛ' 
                  : 'Режим планирования: ВЫКЛ' 
              }}
            </button>
            <p class="planning-instructions">
              {{ !isMissionSystemReady 
                ? 'Ожидание инициализации карты и системы планирования миссии'
                : missionMethods?.planningMode?.value 
                  ? 'Кликайте на карте для добавления точек маршрута' 
                  : 'Включите режим планирования и кликайте на карте' 
              }}
            </p>
          </div>
          
          <!-- Форма добавления точки вручную -->
          <details class="manual-waypoint-form">
            <summary class="manual-waypoint-summary">➕ Добавить точку координатами</summary>
            <div class="waypoint-form">
              <div class="waypoint-inputs">
                <div class="waypoint-input-group">
                  <label class="waypoint-label">Широта:</label>
                  <input 
                    v-model="newWaypoint.lat" 
                    type="number" 
                    step="0.000001"
                    placeholder="55.751244"
                    class="waypoint-input"
                  />
                </div>
                <div class="waypoint-input-group">
                  <label class="waypoint-label">Долгота:</label>
                  <input 
                    v-model="newWaypoint.lon" 
                    type="number" 
                    step="0.000001"
                    placeholder="37.618423"
                    class="waypoint-input"
                  />
                </div>
                <div class="waypoint-input-group">
                  <label class="waypoint-label">Высота (м):</label>
                  <input 
                    v-model="newWaypoint.alt" 
                    type="number" 
                    min="1"
                    max="500"
                    placeholder="50"
                    class="waypoint-input"
                  />
                </div>
              </div>
              <button 
                @click="addWaypointManually"
                class="waypoint-add-button"
                :disabled="!canAddWaypoint"
              >
                ➕ Добавить точку
              </button>
            </div>
          </details>
          
          <!-- Список точек маршрута -->
          <div v-if="missionWaypoints.length > 0" class="waypoints-list">
            <h5 class="waypoints-list__title">Точки маршрута ({{ missionWaypoints.length }}):</h5>
            <div class="waypoints-items">
              <div 
                v-for="(waypoint, index) in missionWaypoints" 
                :key="index"
                class="waypoint-item"
              >
                <div class="waypoint-info">
                  <span class="waypoint-number">{{ index + 1 }}</span>
                  <div class="waypoint-coords">
                    <span class="waypoint-coord">{{ waypoint.lat.toFixed(6) }}, {{ waypoint.lon.toFixed(6) }}</span>
                    <span class="waypoint-altitude">{{ waypoint.alt }}м</span>
                  </div>
                </div>
                <button 
                  @click="removeWaypoint(index)"
                  class="waypoint-remove"
                  title="Удалить точку"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
          
          <!-- Кнопки управления миссией -->
          <div class="mission-controls">
            <button 
              @click="uploadMission"
              :disabled="missionWaypoints.length === 0 || missionStatus?.uploadInProgress || !isConnected || !isMissionSystemReady"
              class="mission-button mission-button--upload"
            >
              <span v-if="missionStatus?.uploadInProgress">⏳</span>
              <span v-else>📤</span>
              {{ missionStatus?.uploadInProgress ? 'Загружаем...' : 'Загрузить на дрон' }}
            </button>
            
            <button 
              @click="clearMission"
              :disabled="missionWaypoints.length === 0 || !isMissionSystemReady"
              class="mission-button mission-button--clear"
            >
              🗑️ Очистить маршрут
            </button>
          </div>
        </div>
      </div>

      <!-- Управление миссией -->
      <div v-if="missionStatus?.isUploaded" class="flight-plan-section">
        <h4 class="flight-plan-section__title">🚀 Управление миссией</h4>
        <div class="mission-execution">
          <div class="mission-status">
            <div class="mission-status-item">
              <span class="mission-status-label">Статус:</span>
              <span class="mission-status-value" :class="missionStatusClass">
                {{ missionStatusText }}
              </span>
            </div>
            <div class="mission-status-item">
              <span class="mission-status-label">Точек загружено:</span>
              <span class="mission-status-value">
                {{ missionWaypoints.length }}
              </span>
            </div>
          </div>
          
          <div class="mission-actions">
            <button 
              @click="setAutoMode"
              :disabled="!isConnected"
              class="mission-button mission-button--auto"
            >
              🤖 AUTO режим
            </button>
            
            <button 
              @click="clearDroneMission"
              :disabled="!isConnected"
              class="mission-button mission-button--clear-drone"
            >
              🧹 Очистить миссию в дроне
            </button>
            
            <button 
              @click="startMission"
              :disabled="!isConnected || missionStatus?.isActive"
              class="mission-button mission-button--start"
            >
              ▶️ Начать полет
            </button>
          </div>
        </div>
      </div>

      <!-- Статус полетного плана -->
      <div class="flight-plan-section">
        <h4 class="flight-plan-section__title">📊 Статус полетного плана</h4>
        <div class="flight-plan-status">
          <div class="flight-plan-status__item">
            <span class="flight-plan-status__label">Точек:</span>
            <span class="flight-plan-status__value">{{ missionWaypoints.length }}</span>
          </div>
          <div class="flight-plan-status__item">
            <span class="flight-plan-status__label">Дистанция:</span>
            <span class="flight-plan-status__value">{{ totalDistance }} км</span>
          </div>
          <div class="flight-plan-status__item">
            <span class="flight-plan-status__label">Время полета:</span>
            <span class="flight-plan-status__value">~{{ estimatedTime }} мин</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Получаем данные дрона через props
const props = defineProps({
  droneData: {
    type: Object,
    default: () => ({ value: null })
  }
})

// Определяем события для отправки в родительский компонент
const emit = defineEmits(['arm', 'disarm', 'takeoff', 'land', 'rtl'])

// Используем WebSocket для отправки команд
const { sendCommand, addMessageHandler, removeMessageHandler } = useWebSocket()

// Получаем методы карты через inject
const missionMethods = inject('missionMethods', null)

// Используем props для droneData
const droneData = props.droneData

// Локальное состояние для формы добавления точек вручную
const newWaypoint = ref({
  lat: null,
  lon: null,
  alt: 50
})

// Вычисляемые свойства на основе данных карты
const missionWaypoints = computed(() => missionMethods?.waypoints?.value || [])
const missionStatus = computed(() => missionMethods?.status?.value || { isUploaded: false, isActive: false })
const isMissionSystemReady = computed(() => !!missionMethods)

// Вычисляемые свойства для статуса
const isConnected = computed(() => {
  return !!droneData?.isConnected
})

const isArmed = computed(() => {
  return !!droneData?.system?.armed
})

const armStatusText = computed(() => {
  if (!isConnected.value) return 'НЕТ СВЯЗИ'
  return isArmed.value ? 'ДВИГАТЕЛИ ВКЛЮЧЕНЫ' : 'ДВИГАТЕЛИ ВЫКЛЮЧЕНЫ'
})

const armStatusClass = computed(() => ({
  'flight-plan-modal__status-indicator--connected': isConnected.value && !isArmed.value,
  'flight-plan-modal__status-indicator--armed': isArmed.value,
  'flight-plan-modal__status-indicator--disconnected': !isConnected.value
}))

// Вычисляемые свойства для миссии
const canAddWaypoint = computed(() => {
  return newWaypoint.value.lat !== null && 
         newWaypoint.value.lon !== null && 
         newWaypoint.value.alt > 0
})

const missionStatusText = computed(() => {
  if (!missionStatus.value.isUploaded) return 'Не загружена'
  if (missionStatus.value.isActive) return 'Активна'
  return 'Загружена'
})

const missionStatusClass = computed(() => ({
  'mission-status--pending': !missionStatus.value.isUploaded,
  'mission-status--active': missionStatus.value.isActive,
  'mission-status--uploaded': missionStatus.value.isUploaded && !missionStatus.value.isActive
}))

const totalDistance = computed(() => {
  if (missionWaypoints.value.length < 2) return '0.0'
  
  let distance = 0
  for (let i = 1; i < missionWaypoints.value.length; i++) {
    const prev = missionWaypoints.value[i - 1]
    const curr = missionWaypoints.value[i]
    distance += calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon)
  }
  
  return (distance / 1000).toFixed(1) // Convert to km
})

const estimatedTime = computed(() => {
  const distanceKm = parseFloat(totalDistance.value)
  const avgSpeed = 15 // m/s average speed
  const timeSeconds = (distanceKm * 1000) / avgSpeed
  return Math.ceil(timeSeconds / 60) // Convert to minutes
})

// Функции для управления режимом планирования
const togglePlanningMode = () => {
  if (!missionMethods) {
    console.warn('⚠️ Mission methods не доступны')
    alert('Система планирования миссии загружается. Попробуйте через секунду.')
    return
  }
  
  if (missionMethods?.planningMode?.value) {
    missionMethods.disablePlanning()
  } else {
    missionMethods.enablePlanning()
  }
}

// Функции для работы с точками через карту
const addWaypointManually = () => {
  if (!canAddWaypoint.value) return
  
  if (!missionMethods) {
    alert('Система планирования миссии еще не готова. Попробуйте через секунду.')
    return
  }
  
  const waypoint = {
    lat: parseFloat(newWaypoint.value.lat),
    lon: parseFloat(newWaypoint.value.lon),
    alt: parseInt(newWaypoint.value.alt) || 50
  }
  
  missionMethods.addWaypoint(waypoint)
  
  // Сбрасываем форму
  newWaypoint.value.lat = null
  newWaypoint.value.lon = null
  newWaypoint.value.alt = 50
}

const removeWaypoint = (index) => {
  if (!missionMethods) {
    console.warn('⚠️ Mission methods не доступны для удаления waypoint')
    return
  }
  missionMethods.removeWaypoint(index)
}

const clearMission = async () => {
  if (!missionMethods) return
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/mission/clear', {
      method: 'POST'
    })
    const result = await response.json()
    
    if (result.success) {
      missionMethods.clearMission()
    } else {
      console.error('❌ Ошибка очистки миссии:', result.message)
      alert('Не удалось очистить миссию: ' + result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка очистки миссии:', error)
    alert('Ошибка очистки миссии: ' + error.message)
  }
}

// Функции для загрузки и запуска миссии
const uploadMission = async () => {
  if (missionWaypoints.value.length === 0 || !missionMethods) return
  
  missionMethods.setStatus({ uploadInProgress: true })
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/mission/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        waypoints: missionWaypoints.value
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      missionMethods.setStatus({ 
        isUploaded: true, 
        uploadInProgress: false,
        totalWaypoints: result.waypointCount 
      })
      alert('Миссия успешно загружена на дрон!')
    } else {
      console.error('❌ Ошибка загрузки миссии:', result.message)
      alert('Не удалось загрузить миссию: ' + result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки миссии:', error)
    alert('Ошибка загрузки миссии: ' + error.message)
  } finally {
    missionMethods.setStatus({ uploadInProgress: false })
  }
}

const setAutoMode = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/drone/mode/auto', {
      method: 'POST'
    })
    const result = await response.json()
    
    if (result.success) {
      alert('Дрон успешно переведен в AUTO режим!')
    } else {
      console.error('❌ Ошибка перевода в AUTO режим:', result.message)
      alert('Не удалось перевести в AUTO режим: ' + result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка перевода в AUTO режим:', error)
    alert('Ошибка перевода в AUTO режим: ' + error.message)
  }
}

const startMission = async () => {
  if (!missionStatus.value.isUploaded || !missionMethods) return
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/mission/start', {
      method: 'POST'
    })
    const result = await response.json()
    
    if (result.success) {
      missionMethods.setStatus({ isActive: true })
      alert('Миссия успешно запущена!')
    } else {
      console.error('❌ Ошибка запуска миссии:', result.message)
      alert('Не удалось запустить миссию: ' + result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка запуска миссии:', error)
    alert('Ошибка запуска миссии: ' + error.message)
  }
}

const clearDroneMission = async () => {
  if (!confirm('Вы уверены, что хотите очистить все миссии, загруженные в дрон?')) {
    return
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/mission/clear', {
      method: 'POST'
    })
    const result = await response.json()
    
    if (result.success) {
      // Обновляем локальное состояние миссии
      if (missionMethods) {
        missionMethods.setStatus({ 
          isUploaded: false, 
          isActive: false,
          currentWaypoint: 0,
          totalWaypoints: 0
        })
      }
      alert('Миссия в дроне успешно очищена!')
    } else {
      console.error('❌ Ошибка очистки миссии в дроне:', result.message)
      alert('Не удалось очистить миссию в дроне: ' + result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка очистки миссии в дроне:', error)
    alert('Ошибка очистки миссии в дроне: ' + error.message)
  }
}

// Обработчик сообщений от WebSocket для обновления статуса миссии
const handleMissionStatus = (event) => {
  try {
    const message = JSON.parse(event.data)
    if (message.type === 'mission_status' && message.data && missionMethods) {
      const missionData = message.data
      
      // Обновляем статус миссии
      missionMethods.setStatus({
        isUploaded: missionData.isUploaded,
        isActive: missionData.isActive,
        currentWaypoint: missionData.currentWaypoint || 0,
        totalWaypoints: missionData.totalWaypoints || 0
      })
      
      // Если миссия загружена с сервера, обновляем waypoints
      if (missionData.waypoints && missionData.waypoints.length > 0) {
        missionMethods.setWaypoints(missionData.waypoints)
      }
    }
  } catch (error) {
    console.error('Error parsing mission status:', error)
  }
}

// Функция для расчета расстояния между двумя GPS точками
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // Радиус Земли в метрах
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // расстояние в метрах
}

// Функция для загрузки текущего статуса миссии при монтировании
const loadMissionStatus = async () => {
  if (!missionMethods) return
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/mission')
    const result = await response.json()
    
    if (result.success && result.mission) {
      const missionData = result.mission
      
      missionMethods.setStatus({
        isUploaded: missionData.isUploaded,
        isActive: missionData.isActive,
        uploadInProgress: missionData.uploadInProgress || false,
        currentWaypoint: missionData.currentWaypoint || 0,
        totalWaypoints: missionData.totalWaypoints || 0
      })
      
      if (missionData.waypoints && missionData.waypoints.length > 0) {
        missionMethods.setWaypoints(missionData.waypoints)
      }
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки статуса миссии:', error)
  }
}

// Жизненный цикл компонента
onMounted(() => {
  addMessageHandler(handleMissionStatus)
  
  // Небольшая задержка для инициализации системы планирования
  setTimeout(() => {
    loadMissionStatus()
  }, 500)
  
  // Если система планирования не готова через 3 секунды, показываем предупреждение
  setTimeout(() => {
    if (!isMissionSystemReady.value) {
      console.warn('⚠️ Система планирования миссий не инициализирована через 3 секунды')
    }
  }, 3000)
})

onUnmounted(() => {
  removeMessageHandler(handleMissionStatus)
})

// Функции отправки команд
const sendArmCommand = () => {
  emit('arm')
}

const sendDisarmCommand = () => {
  emit('disarm')
}

const sendTakeoffCommand = () => {
  emit('takeoff')
}

const sendLandCommand = () => {
  emit('land')
}

const sendRTLCommand = () => {
  emit('rtl')
}
</script>

<style scoped>
.flight-plan-modal {
  padding: 0;
}

.flight-plan-modal__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Секции */
.flight-plan-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 18px;
  margin-bottom: 0;
}

.flight-plan-section__title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Управление двигателями */
.flight-plan-modal__arm-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 0;
}

.flight-plan-modal__arm-button {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.flight-plan-modal__arm-button--arm {
  background: #27ae60;
  color: white;
}

.flight-plan-modal__arm-button--arm:hover {
  background: #229954;
}

.flight-plan-modal__arm-button--disarm {
  background: #e74c3c;
  color: white;
}

.flight-plan-modal__arm-button--disarm:hover {
  background: #c0392b;
}

.flight-plan-modal__arm-icon {
  font-size: 16px;
}

/* Статус ARM */
.flight-plan-modal__arm-status {
  text-align: center;
}

.flight-plan-modal__status-indicator {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.flight-plan-modal__status-indicator--connected {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.flight-plan-modal__status-indicator--armed {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.flight-plan-modal__status-indicator--disarmed {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.flight-plan-modal__status-indicator--disconnected {
  background: rgba(149, 165, 166, 0.2);
  color: #95a5a6;
  border: 1px solid rgba(149, 165, 166, 0.3);
}

/* Полетный план */
.flight-plan-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flight-plan-info {
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.2);
  border-radius: 8px;
  padding: 12px;
}

.flight-plan-info__text {
  margin: 0;
  color: #3498db;
  font-size: 14px;
  text-align: center;
}

.flight-plan-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.flight-plan-button {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.flight-plan-button--load {
  background: #3498db;
  color: white;
}

.flight-plan-button--load:hover {
  background: #2980b9;
  transform: translateY(-1px);
}

.flight-plan-button--save {
  background: #27ae60;
  color: white;
}

.flight-plan-button--save:hover {
  background: #229954;
  transform: translateY(-1px);
}

.flight-plan-button--clear {
  background: #e74c3c;
  color: white;
}

.flight-plan-button--clear:hover {
  background: #c0392b;
  transform: translateY(-1px);
}

/* Статус полетного плана */
.flight-plan-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.flight-plan-status__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.flight-plan-status__label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.flight-plan-status__value {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

/* Создание миссии */
.mission-creation {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mission-instructions__text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

/* Форма добавления точек */
.waypoint-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.waypoint-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr 80px;
  gap: 8px;
  align-items: end;
}

.waypoint-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.waypoint-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.waypoint-input {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 14px;
  transition: all 0.2s ease;
}

.waypoint-input:focus {
  outline: none;
  border-color: #3498db;
  background: rgba(255, 255, 255, 0.08);
}

.waypoint-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.waypoint-add-button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.waypoint-add-button:hover:not(:disabled) {
  background: #2980b9;
}

.waypoint-add-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Список точек */
.waypoints-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.waypoints-list__title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.waypoints-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.waypoint-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.waypoint-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.waypoint-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.waypoint-number {
  background: #3498db;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.waypoint-coords {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.waypoint-coord {
  color: #ffffff;
  font-size: 13px;
  font-family: monospace;
}

.waypoint-altitude {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
}

.waypoint-remove {
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.waypoint-remove:hover {
  background: rgba(231, 76, 60, 0.3);
}

/* Кнопки управления миссией */
.mission-controls, .mission-actions {
  display: flex;
  gap: 12px;
}

.mission-button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mission-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mission-button--upload {
  background: #3498db;
  color: white;
}

.mission-button--upload:hover:not(:disabled) {
  background: #2980b9;
}

.mission-button--clear {
  background: #e74c3c;
  color: white;
}

.mission-button--clear:hover:not(:disabled) {
  background: #c0392b;
}

.mission-button--auto {
  background: #9b59b6;
  color: white;
}

.mission-button--auto:hover:not(:disabled) {
  background: #8e44ad;
}

.mission-button--start {
  background: #27ae60;
  color: white;
}

.mission-button--start:hover:not(:disabled) {
  background: #229954;
}

.mission-button--clear-drone {
  background: #e74c3c;
  color: white;
}

.mission-button--clear-drone:hover:not(:disabled) {
  background: #c0392b;
}

/* Статус миссии */
.mission-execution {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mission-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mission-status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mission-status-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mission-status-value {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.mission-status-value.mission-status--pending {
  color: #95a5a6;
}

.mission-status-value.mission-status--uploaded {
  color: #3498db;
}

.mission-status-value.mission-status--active {
  color: #27ae60;
}

/* Режим планирования */
.planning-mode-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-bottom: 0;
}

.planning-mode-toggle {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #6b7280;
  color: white;
}

.planning-mode-toggle--active {
  background: #3498db;
}

.planning-mode-toggle:hover:not(:disabled) {
  background: #4b5563;
}

.planning-mode-toggle--active:hover:not(:disabled) {
  background: #2980b9;
}

.planning-mode-toggle--disabled {
  background: #4b5563 !important;
  opacity: 0.5;
  cursor: not-allowed !important;
}

.planning-mode-toggle:disabled {
  cursor: not-allowed;
}

.planning-instructions {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin: 0;
  text-align: center;
  line-height: 1.5;
}

/* Ручное добавление точек */
.manual-waypoint-form {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0;
  background: rgba(255, 255, 255, 0.02);
}

.manual-waypoint-summary {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
  color: #ffffff;
  font-size: 14px;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.manual-waypoint-summary:hover {
  background: rgba(255, 255, 255, 0.05);
}

.manual-waypoint-form[open] .manual-waypoint-summary {
  background: rgba(255, 255, 255, 0.05);
}

.manual-waypoint-form .waypoint-form {
  padding: 16px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .flight-plan-modal__arm-controls {
    flex-direction: column;
  }
  
  .flight-plan-buttons {
    grid-template-columns: 1fr;
  }
  
  .flight-plan-status {
    grid-template-columns: 1fr;
  }
  
  .waypoint-inputs {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .mission-controls, .mission-actions {
    flex-direction: column;
  }
  
  .mission-status {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
