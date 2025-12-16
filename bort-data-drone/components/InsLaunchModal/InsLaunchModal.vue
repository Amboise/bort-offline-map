<template>
  <div class="ins-launch-modal">
    <div class="ins-launch-modal__content">
      <div class="ins-launch-section">
        <h4 class="ins-launch-section__title">🧭 Инерциальная навигация</h4>
        <div class="ins-status">
          <div class="ins-status-item">
            <span class="ins-status-label">Режим ИНС:</span>
            <span class="ins-status-value" :class="insStatusClass">
              {{ insStatus }}
            </span>
          </div>
        </div>
        
        <button 
          @click="toggleInsMode"
          :disabled="!isConnected || insLoading"
          :class="[
            'ins-button',
            { 
              'ins-button--active': insModeEnabled,
              'ins-button--loading': insLoading
            }
          ]"
        >
          <span v-if="insLoading">⏳</span>
          <span v-else-if="insModeEnabled">✅</span>
          <span v-else>⚙️</span>
          {{ insModeEnabled ? 'Режим ИНС: ВКЛ' : 'Включить режим ИНС' }}
        </button>
      </div>

      <div class="ins-launch-section">
        <h4 class="ins-launch-section__title">⚙️ Корректировки</h4>
        
        <div v-if="gpsOverrideActive" class="ins-gps-override-info">
          <span class="ins-gps-override-info__icon">🔒</span>
          <span class="ins-gps-override-info__text">
            GPS Override активен - дрон зафиксирован в скорректированной позиции
          </span>
        </div>
        
        <div class="ins-corrections">
          <button 
            @click="startCorrection"
            :disabled="!isConnected || !insModeEnabled"
            :class="[
              'ins-button',
              'ins-button--correction',
              { 'ins-button--active-correction': isSelectingStartPoint }
            ]"
          >
            <span v-if="isSelectingStartPoint">📍 Кликните на карту...</span>
            <span v-else>📍 Корректировка старта</span>
          </button>
          
          <button 
            @click="windCorrection"
            :disabled="!isConnected || !insModeEnabled"
            class="ins-button ins-button--correction"
          >
            💨 Корректировка ветра
          </button>
        </div>
        
        <p v-if="isSelectingStartPoint" class="ins-hint">
          👆 Кликните на карту для установки новой точки старта
        </p>
        
        <p v-if="gpsOverrideActive && !isSelectingStartPoint" class="ins-hint ins-hint--info">
          ℹ️ Чтобы дрон снова двигался по реальным GPS данным, выключите режим ИНС
        </p>
      </div>

      <!-- Сброс и подготовка -->
      <div class="ins-launch-section">
        <h4 class="ins-launch-section__title">🔧 Подготовка</h4>
        <div class="ins-prepare">
          <button 
            @click="resetPvd"
            :disabled="!isConnected"
            class="ins-button ins-button--reset"
          >
            🔄 Сброс ПВД
          </button>
          
          <button 
            @click="prepareSystem"
            :disabled="!isConnected || !insModeEnabled"
            class="ins-button ins-button--prepare"
          >
            ⚡ Подготовить
          </button>
        </div>
      </div>

      <!-- Запуск -->
      <div class="ins-launch-section">
        <h4 class="ins-launch-section__title">🚀 Запуск</h4>
        
        <!-- Статус миссии -->
        <div class="ins-mission-status">
          <div class="ins-mission-status-item">
            <span class="ins-mission-label">Миссия загружена:</span>
            <span class="ins-mission-value" :class="{ 'ins-mission-value--success': missionLoaded }">
              {{ missionLoaded ? 'ДА' : 'НЕТ' }}
            </span>
          </div>
          <div v-if="missionStatus" class="ins-mission-status-item">
            <span class="ins-mission-label">Точек маршрута:</span>
            <span class="ins-mission-value" :class="{ 'ins-mission-value--success': missionWaypointCount > 0 }">
              {{ missionWaypointCount }}
            </span>
          </div>
        </div>
        
        <!-- Отладочная информация -->
        <div v-if="!missionLoaded" class="ins-debug">
          <small>Debug: isUploaded={{ missionStatus?.isUploaded }}, count={{ missionStatus?.waypointCount }}</small>
        </div>
        
        <button 
          @click="insLaunch"
          :disabled="!isConnected || !insModeEnabled || !systemPrepared || !missionLoaded"
          class="ins-button ins-button--launch"
        >
          🚀 СТАРТ
        </button>
        
        <p v-if="!systemPrepared && insModeEnabled" class="ins-warning">
          ⚠️ Система не подготовлена. Нажмите "Подготовить"
        </p>
        
        <p v-if="!missionLoaded && insModeEnabled && systemPrepared" class="ins-warning">
          ⚠️ Миссия не загружена. Откройте "Полетный план" и загрузите точки маршрута
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  droneData: {
    type: Object,
    default: () => ({ value: null })
  }
})

const emit = defineEmits(['setMapSelectionMode', 'cancelMapSelection'])

const { sendCommand, addMessageHandler, removeMessageHandler } = useWebSocket()

// Состояние
const insModeEnabled = ref(false)
const systemPrepared = ref(false)
const insLoading = ref(false)
const missionStatus = ref(null)
const isSelectingStartPoint = ref(false)
const gpsOverrideActive = ref(false) // Флаг GPS Override

const isConnected = computed(() => {
  return !!props.droneData?.isConnected
})

const missionLoaded = computed(() => {
  return missionStatus.value?.isUploaded && missionStatus.value?.waypointCount > 0
})

const missionWaypointCount = computed(() => {
  return missionStatus.value?.waypointCount || 0
})

const insStatus = computed(() => {
  if (!isConnected.value) return 'НЕТ СВЯЗИ'
  if (insLoading.value) return 'ЗАГРУЗКА...'
  if (insModeEnabled.value && systemPrepared.value) return 'ГОТОВ К ЗАПУСКУ'
  if (insModeEnabled.value) return 'ТРЕБУЕТСЯ ПОДГОТОВКА'
  return 'ВЫКЛЮЧЕН'
})

const insStatusClass = computed(() => ({
  'ins-status--disconnected': !isConnected.value,
  'ins-status--ready': insModeEnabled.value && systemPrepared.value,
  'ins-status--preparing': insModeEnabled.value && !systemPrepared.value,
  'ins-status--off': !insModeEnabled.value && isConnected.value
}))

// Включение/выключение режима ИНС
const toggleInsMode = async () => {
  if (!isConnected.value) return
  
  insLoading.value = true
  
  try {
    const newState = !insModeEnabled.value
    
    const response = await fetch('http://localhost:3001/api/drone/ins/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: newState })
    })
    
    const result = await response.json()
    
    if (result.success) {
      // Обновляем состояние локально сразу для быстрого отклика UI
      insModeEnabled.value = newState
      if (!newState) {
        systemPrepared.value = false
      }
      // WebSocket через 100мс подтвердит состояние
    } else {
      console.error('❌ Ошибка:', result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка переключения режима ИНС:', error)
  } finally {
    insLoading.value = false
  }
}

// Корректировка старта
const startCorrection = () => {
  if (!isConnected.value || !insModeEnabled.value) return
  
  if (isSelectingStartPoint.value) {
    // Отменить режим выбора
    isSelectingStartPoint.value = false
    emit('cancelMapSelection')
  } else {
    // Активировать режим выбора точки на карте
    isSelectingStartPoint.value = true
    emit('setMapSelectionMode', { mode: 'startCorrection', callback: handleStartPointSelected })
  }
}

// Обработчик выбранной точки старта
const handleStartPointSelected = async (latLng) => {
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/ins/correction/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lat: latLng.lat, 
        lng: latLng.lng 
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
    } else {
      console.error('❌ Ошибка корректировки:', result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка корректировки старта:', error)
  } finally {
    // Всегда отключаем режим выбора после клика
    isSelectingStartPoint.value = false
    emit('cancelMapSelection')
  }
}

// Корректировка ветра
const windCorrection = async () => {
  if (!isConnected.value || !insModeEnabled.value) return
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/ins/correction/wind', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
    } else {
      console.error('❌ Ошибка корректировки:', result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка корректировки ветра:', error)
  }
}

// Сброс ПВД
const resetPvd = async () => {
  if (!isConnected.value) return
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/ins/reset-pvd', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
    } else {
      console.error('❌ Ошибка сброса ПВД:', result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка сброса ПВД:', error)
  }
}

// Подготовка системы
const prepareSystem = async () => {
  if (!isConnected.value || !insModeEnabled.value) return
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/ins/prepare', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
      systemPrepared.value = true
    } else {
      console.error('❌ Ошибка подготовки:', result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка подготовки системы:', error)
  }
}

// Запуск в режиме ИНС
const insLaunch = async () => {
  if (!isConnected.value || !insModeEnabled.value || !systemPrepared.value) return
  
  try {
    const response = await fetch('http://localhost:3001/api/drone/ins/launch', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
    } else {
      console.error('❌ Ошибка запуска:', result.message)
    }
  } catch (error) {
    console.error('❌ Ошибка запуска в режиме ИНС:', error)
  }
}

// Обработчик сообщений от WebSocket
const handleInsStatus = (event) => {
  try {
    const message = JSON.parse(event.data)
    
    // Обработка статуса ИНС
    if (message.type === 'ins_status' && message.data) {
      const newEnabled = message.data.enabled
      const newPrepared = message.data.prepared
      const newGpsOverride = message.data.overrideGPS || false
      
      // Обновляем только если значения действительно изменились
      if (insModeEnabled.value !== newEnabled) {
        insModeEnabled.value = newEnabled
      }
      if (systemPrepared.value !== newPrepared) {
        systemPrepared.value = newPrepared
      }
      if (gpsOverrideActive.value !== newGpsOverride) {
        gpsOverrideActive.value = newGpsOverride
      }
    }
    
    // Обработка статуса миссии
    if (message.type === 'mission_status' && message.data) {
      missionStatus.value = message.data
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error)
  }
}

// Загрузить текущий статус с сервера (только один раз при монтировании)
const loadInsStatus = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/drone/ins/status')
    const result = await response.json()
    
    if (result.success && result.insMode) {
      insModeEnabled.value = result.insMode.enabled
      systemPrepared.value = result.insMode.prepared
      gpsOverrideActive.value = result.insMode.overrideGPS || false
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки статуса ИНС:', error)
  }
}

// Загрузить статус миссии
const loadMissionStatus = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/drone/mission')
    const result = await response.json()
    
    
    if (result.success && result.mission) {
      missionStatus.value = result.mission
    } else {
      console.warn('⚠️ Миссия не найдена или не загружена')
      missionStatus.value = { isUploaded: false, waypointCount: 0 }
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки статуса миссии:', error)
    missionStatus.value = { isUploaded: false, waypointCount: 0 }
  }
}

onMounted(async () => {
  addMessageHandler(handleInsStatus)
  // Загружаем текущий статус один раз при открытии
  await Promise.all([
    loadInsStatus(),
    loadMissionStatus()
  ])
})

onUnmounted(() => {
  removeMessageHandler(handleInsStatus)
})
</script>

<style scoped>
.ins-launch-modal {
  padding: 0;
}

.ins-launch-modal__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Секции */
.ins-launch-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 18px;
}

.ins-launch-section__title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Статус ИНС */
.ins-status {
  margin-bottom: 16px;
}

.ins-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.ins-status-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.ins-status-value {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ins-status--disconnected {
  color: #95a5a6;
}

.ins-status--ready {
  color: #2ecc71;
}

.ins-status--preparing {
  color: #f39c12;
}

.ins-status--off {
  color: #e74c3c;
}

/* Кнопки */
.ins-button {
  width: 100%;
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
  background: #3498db;
  color: white;
}

.ins-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.ins-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.ins-button--active {
  background: #27ae60;
  box-shadow: 0 0 20px rgba(39, 174, 96, 0.4);
}

.ins-button--loading {
  background: #95a5a6;
}

.ins-button--correction {
  background: #9b59b6;
}

.ins-button--correction:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.4);
}

.ins-button--active-correction {
  background: #e74c3c;
  animation: pulseCorrection 1.5s ease-in-out infinite;
}

@keyframes pulseCorrection {
  0%, 100% {
    box-shadow: 0 0 15px rgba(231, 76, 60, 0.6);
  }
  50% {
    box-shadow: 0 0 25px rgba(231, 76, 60, 0.9);
  }
}

.ins-button--reset {
  background: #e67e22;
}

.ins-button--reset:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(230, 126, 34, 0.4);
}

.ins-button--prepare {
  background: #f39c12;
}

.ins-button--prepare:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.4);
}

.ins-button--launch {
  background: #e74c3c;
  font-size: 16px;
  padding: 18px 24px;
}

.ins-button--launch:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(231, 76, 60, 0.5);
}

/* Группы кнопок */
.ins-corrections,
.ins-prepare {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Предупреждение */
.ins-warning {
  margin-top: 12px;
  padding: 12px;
  background: rgba(243, 156, 18, 0.1);
  border: 1px solid rgba(243, 156, 18, 0.3);
  border-radius: 6px;
  color: #f39c12;
  font-size: 13px;
  text-align: center;
  margin-bottom: 0;
}

/* Подсказка */
.ins-hint {
  margin-top: 12px;
  padding: 12px;
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 6px;
  color: #3498db;
  font-size: 13px;
  text-align: center;
  margin-bottom: 0;
  animation: hintPulse 2s ease-in-out infinite;
}

.ins-hint--info {
  background: rgba(243, 156, 18, 0.1);
  border-color: rgba(243, 156, 18, 0.3);
  color: #f39c12;
}

@keyframes hintPulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

/* GPS Override индикатор */
.ins-gps-override-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 16px;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 6px;
  animation: gpsOverridePulse 2s ease-in-out infinite;
}

.ins-gps-override-info__icon {
  font-size: 20px;
  line-height: 1;
}

.ins-gps-override-info__text {
  flex: 1;
  font-size: 13px;
  color: #e74c3c;
  font-weight: 600;
}

@keyframes gpsOverridePulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(231, 76, 60, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(231, 76, 60, 0.5);
  }
}

/* Статус миссии */
.ins-mission-status {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.ins-mission-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ins-mission-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.ins-mission-value {
  font-size: 16px;
  font-weight: 700;
  color: #95a5a6;
  
  &--success {
    color: #2ecc71;
  }
}

.ins-debug {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  
  small {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    font-family: monospace;
  }
}

/* Адаптивность */
@media (max-width: 768px) {
  .ins-launch-section {
    padding: 14px;
  }
  
  .ins-button {
    padding: 12px 16px;
    font-size: 13px;
  }
  
  .ins-button--launch {
    font-size: 15px;
    padding: 16px 20px;
  }
}
</style>

