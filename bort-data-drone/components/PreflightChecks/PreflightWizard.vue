<template>
  <div v-if="isVisible" class="preflight-modal-overlay" @click.self="closeModal">
    <div class="preflight-modal">
      <!-- Header -->
      <div class="preflight-header">
        <h2 class="preflight-title">
          {{ currentStepConfig.title }}
        </h2>
        <button class="preflight-close" @click="closeModal" title="Закрыть">
          <span>✕</span>
        </button>
      </div>

      <!-- Content -->
      <div class="preflight-content">
        <!-- Welcome Screen -->
        <div v-if="currentStep === 0" class="welcome-screen">
          <div class="welcome-logo">
            <img src="/drone.png" alt="Drone" />
          </div>
          <p class="welcome-text">Для продолжения нажмите "Далее".</p>
          
          <!-- Connection Status -->
          <div class="connection-status">
            <div v-if="connectionChecking" class="status-checking">
              <span class="spinner">⏳</span>
              Проверка подключения к дрону...
            </div>
            <div v-else-if="droneConnected" class="status-connected">
              <span class="status-icon">✅</span>
              Дрон подключен
            </div>
            <div v-else class="status-disconnected">
              <span class="status-icon">❌</span>
              Дрон не подключен
              <p class="status-hint">
                Подключитесь к дрону через страницу настроек автопилота
              </p>
            </div>
          </div>
        </div>

        <!-- Step 1: Parachute Check -->
        <div v-else-if="currentStep === 1" class="parachute-screen">
          <button 
            class="preflight-btn primary" 
            @click="deployParachute"
            :disabled="!droneConnected || parachuteDeploying"
          >
            {{ parachuteDeploying ? 'Выброс...' : 'Выбросить парашют' }}
          </button>
          <button 
            class="preflight-btn primary" 
            @click="retractParachute"
            :disabled="!droneConnected || parachuteRetracting"
          >
            {{ parachuteRetracting ? 'Закрытие...' : 'Закрыть парашют' }}
          </button>
          <button 
            class="preflight-btn secondary" 
            @click="releaseParachute"
            :disabled="!droneConnected || parachuteReleasing"
          >
            {{ parachuteReleasing ? 'Отцеп...' : 'Отцеп парашюта' }}
          </button>
          <div v-if="parachuteStatus" class="parachute-status">
            {{ parachuteStatus }}
          </div>
        </div>

        <!-- Step 2: Aileron Check -->
        <div v-else-if="currentStep === 2" class="aileron-screen">
          <div class="aileron-buttons">
            <button 
              class="aileron-btn" 
              :class="{ 
                active: aileronPosition === 'up',
                success: aileronTestResults.up === true,
                error: aileronTestResults.up === false,
                testing: aileronTesting === 'up'
              }"
              @click="testAileronPosition('up')"
              :disabled="!droneConnected || aileronTesting"
            >
              <span class="aileron-icon aileron-icon--up">
                <svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Wing angled up -->
                  <path d="M 10 24 L 30 24 L 60 8 L 70 8 L 70 10 L 61 10 L 31 26 L 10 26 Z" fill="currentColor" opacity="0.9"/>
                  <path d="M 30 24 L 60 8 L 70 8" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
                </svg>
              </span>
              <span v-if="aileronTesting === 'up'">Проверка...</span>
              <span v-else-if="aileronTestResults.up === true">✓ Вверх</span>
              <span v-else-if="aileronTestResults.up === false">✗ Вверх</span>
              <span v-else>Вверх</span>
            </button>
            <button 
              class="aileron-btn"
              :class="{ 
                active: aileronPosition === 'down',
                success: aileronTestResults.down === true,
                error: aileronTestResults.down === false,
                testing: aileronTesting === 'down'
              }"
              @click="testAileronPosition('down')"
              :disabled="!droneConnected || aileronTesting"
            >
              <span class="aileron-icon aileron-icon--down">
                <svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Wing angled down -->
                  <path d="M 10 8 L 30 8 L 60 24 L 70 24 L 70 22 L 61 22 L 31 6 L 10 6 Z" fill="currentColor" opacity="0.9"/>
                  <path d="M 30 8 L 60 24 L 70 24" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
                </svg>
              </span>
              <span v-if="aileronTesting === 'down'">Проверка...</span>
              <span v-else-if="aileronTestResults.down === true">✓ Вниз</span>
              <span v-else-if="aileronTestResults.down === false">✗ Вниз</span>
              <span v-else>Вниз</span>
            </button>
            <button 
              class="aileron-btn"
              :class="{ 
                active: aileronPosition === 'neutral',
                success: aileronTestResults.neutral === true,
                error: aileronTestResults.neutral === false,
                testing: aileronTesting === 'neutral'
              }"
              @click="testAileronPosition('neutral')"
              :disabled="!droneConnected || aileronTesting"
            >
              <span class="aileron-icon aileron-icon--neutral">
                <svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Wing horizontal -->
                  <path d="M 10 14 L 70 14 L 70 18 L 10 18 Z" fill="currentColor" opacity="0.9"/>
                  <path d="M 10 14 L 70 14" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
                </svg>
              </span>
              <span v-if="aileronTesting === 'neutral'">Проверка...</span>
              <span v-else-if="aileronTestResults.neutral === true">✓ Нейтраль</span>
              <span v-else-if="aileronTestResults.neutral === false">✗ Нейтраль</span>
              <span v-else>Нейтраль</span>
            </button>
          </div>
          <div v-if="aileronStatus" class="aileron-status" :class="aileronStatusClass">
            {{ aileronStatus }}
          </div>
        </div>

        <!-- Step 3: PVD Check -->
        <div v-else-if="currentStep === 3" class="pvd-screen">
          <button 
            class="preflight-btn primary" 
            @click="resetPVDCalibration"
            :disabled="!droneConnected || pvdResetting"
          >
            {{ pvdResetting ? 'Калибровка...' : 'Сброс ПВД' }}
          </button>
          <div v-if="pvdStatus" class="pvd-status" :class="pvdStatusClass">
            {{ pvdStatus }}
          </div>
          <div class="pvd-chart">
            <canvas ref="pvdCanvas" width="460" height="300"></canvas>
          </div>
          <div class="pvd-info">
            <div class="pvd-info-item">
              <span class="pvd-info-label">Воздушная скорость:</span>
              <span class="pvd-info-value">{{ currentPVDData.airspeed.toFixed(1) }} км/ч</span>
            </div>
            <div class="pvd-info-item">
              <span class="pvd-info-label">Путевая скорость:</span>
              <span class="pvd-info-value">{{ currentPVDData.groundSpeed.toFixed(1) }} км/ч</span>
            </div>
            <div class="pvd-info-item">
              <span class="pvd-info-label">Вертикальная скорость:</span>
              <span class="pvd-info-value">{{ currentPVDData.verticalSpeed.toFixed(1) }} м/с</span>
            </div>
          </div>
        </div>

        <!-- Step 4: Motor Check -->
        <div v-else-if="currentStep === 4" class="motor-screen">
          <div class="motor-control">
            <div class="motor-value" :class="motorStatusClass">
              {{ motorThrottle }}%
            </div>
            <button 
              class="preflight-btn primary motor-btn" 
              @click="toggleMotor"
              :disabled="isMotorRunning || !droneConnected"
            >
              {{ isMotorRunning ? 'Идет проверка...' : 'Вращение' }}
            </button>
          </div>
          <div v-if="isMotorRunning" class="motor-progress">
            <div class="motor-progress-bar" :style="{ width: motorThrottle + '%' }"></div>
          </div>
          <div v-if="motorStatus" class="motor-status" :class="motorStatusClass">
            {{ motorStatus }}
          </div>
          <div v-if="motorTestResults.length > 0" class="motor-results">
            <div class="motor-results-title">Результаты проверки моторов:</div>
            <div 
              v-for="(result, index) in motorTestResults" 
              :key="index"
              class="motor-result-item"
              :class="{ success: result.success, error: !result.success }"
            >
              <span class="motor-number">Мотор {{ result.motorNumber }}</span>
              <span class="motor-result-status">
                {{ result.success ? '✓ Работает' : '✗ Ошибка' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Step 5: Avionics Check -->
        <div v-else-if="currentStep === 5" class="avionics-screen">
          <button 
            class="preflight-btn primary avionics-check-btn" 
            @click="checkAvionics"
            :disabled="!droneConnected || avionicsChecking"
          >
            {{ avionicsChecking ? 'Проверка...' : 'Проверить авионику' }}
          </button>
          
          <div class="avionics-control">
            <!-- Up arrows -->
            <div class="arrow-row">
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">▲</button>
            </div>
            <div class="arrow-row">
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">▲</button>
            </div>
            <div class="arrow-row">
              <button class="arrow-btn active" :class="{ disabled: !avionicsCheckComplete }">▲</button>
            </div>

            <!-- Middle row with left/center/right -->
            <div class="arrow-row middle">
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">◀</button>
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">◀</button>
              <button class="arrow-btn active" :class="{ disabled: !avionicsCheckComplete }">◀</button>
              
              <div class="avionics-value" :class="avionicsStatusClass">
                Pitch: {{ pitch.toFixed(1) }}°<br>
                Roll: {{ roll.toFixed(1) }}°
              </div>
              
              <button class="arrow-btn active" :class="{ disabled: !avionicsCheckComplete }">▶</button>
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">▶</button>
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">▶</button>
            </div>

            <!-- Down arrows -->
            <div class="arrow-row">
              <button class="arrow-btn active" :class="{ disabled: !avionicsCheckComplete }">▼</button>
            </div>
            <div class="arrow-row">
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">▼</button>
            </div>
            <div class="arrow-row">
              <button class="arrow-btn" :class="{ disabled: !avionicsCheckComplete }">▼</button>
            </div>
          </div>
          
          <div v-if="avionicsStatus" class="avionics-status" :class="avionicsStatusClass">
            {{ avionicsStatus }}
          </div>
          
          <div v-if="avionicsCheckComplete" class="avionics-result">
            <div class="avionics-result-item" :class="{ success: avionicsTests.pitch, error: !avionicsTests.pitch }">
              <span class="test-name">Pitch (тангаж)</span>
              <span class="test-value">{{ pitch.toFixed(2) }}°</span>
              <span class="test-status">{{ avionicsTests.pitch ? '✓' : '✗' }}</span>
            </div>
            <div class="avionics-result-item" :class="{ success: avionicsTests.roll, error: !avionicsTests.roll }">
              <span class="test-name">Roll (крен)</span>
              <span class="test-value">{{ roll.toFixed(2) }}°</span>
              <span class="test-status">{{ avionicsTests.roll ? '✓' : '✗' }}</span>
            </div>
            <div class="avionics-result-item" :class="{ success: avionicsTests.yaw, error: !avionicsTests.yaw }">
              <span class="test-name">Yaw (рыскание)</span>
              <span class="test-value">{{ yaw.toFixed(2) }}°</span>
              <span class="test-status">{{ avionicsTests.yaw ? '✓' : '✗' }}</span>
            </div>
          </div>
        </div>

        <!-- Step 6: Compass Calibration -->
        <div v-else-if="currentStep === 6" class="compass-screen">
          <button 
            class="preflight-btn primary" 
            @click="startCompassCalibration"
            :disabled="isCalibrating || !droneConnected"
          >
            {{ isCalibrating ? 'Калибровка...' : 'Начать' }}
          </button>
          <button 
            class="preflight-btn secondary" 
            @click="fixCompassCalibration"
            :disabled="!isCalibrating"
          >
            Фиксировать
          </button>
          <div v-if="calibrationProgress > 0 || compassStatus" class="calibration-container">
            <div v-if="isCalibrating || calibrationProgress > 0" class="calibration-progress">
              <div class="calibration-text">Калибровка: {{ calibrationProgress }}%</div>
              <div class="calibration-bar">
                <div class="calibration-fill" :style="{ width: calibrationProgress + '%' }"></div>
              </div>
            </div>
            <div v-if="compassStatus" class="compass-status" :class="compassStatusClass">
              {{ compassStatus }}
            </div>
            <div v-if="compassCalibrationComplete" class="compass-result">
              <div class="compass-result-icon" :class="{ success: compassCalibrationSuccess, error: !compassCalibrationSuccess }">
                {{ compassCalibrationSuccess ? '✓' : '✗' }}
              </div>
              <div class="compass-result-text">
                {{ compassCalibrationSuccess ? 'Магнитометр откалиброван успешно' : 'Калибровка не удалась' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Step 7: Battery Setup -->
        <div v-else-if="currentStep === 7" class="battery-screen">
          <button 
            class="preflight-btn primary battery-check-btn" 
            @click="checkBattery"
            :disabled="!droneConnected || batteryChecking"
          >
            {{ batteryChecking ? 'Проверка...' : 'Проверить батарею' }}
          </button>
          
          <div v-if="batteryCheckComplete" class="battery-info">
            <div class="battery-info-item" :class="{ success: batteryTests.voltage, error: !batteryTests.voltage }">
              <span class="info-label">Напряжение</span>
              <span class="info-value">{{ batteryData.voltage.toFixed(1) }} В</span>
              <span class="info-status">{{ batteryTests.voltage ? '✓' : '✗' }}</span>
            </div>
            
            <div class="battery-info-item" :class="{ success: batteryTests.current, error: !batteryTests.current }">
              <span class="info-label">Ток</span>
              <span class="info-value">{{ batteryData.current.toFixed(1) }} А</span>
              <span class="info-status">{{ batteryTests.current ? '✓' : '✗' }}</span>
            </div>
            
            <div class="battery-info-item" :class="{ success: batteryTests.remaining, error: !batteryTests.remaining }">
              <span class="info-label">Заряд</span>
              <span class="info-value">{{ batteryData.remaining }}%</span>
              <span class="info-status">{{ batteryTests.remaining ? '✓' : '✗' }}</span>
            </div>
          </div>
          
          <div v-if="batteryStatus" class="battery-status" :class="batteryStatusClass">
            {{ batteryStatus }}
          </div>
          
          <div class="battery-form">
            <div class="form-row">
              <label>Тип АКБ</label>
              <select v-model="batteryType" class="form-select">
                <option value="lilo">Lilo</option>
                <option value="lipo">LiPo</option>
                <option value="liion">Li-Ion</option>
              </select>
            </div>

            <div class="form-row">
              <label>Ёмкость АКБ</label>
              <select v-model="batteryCapacity" class="form-select">
                <option value="20">20 Ач</option>
                <option value="22">22 Ач</option>
                <option value="28">28 Ач</option>
              </select>
            </div>

            <div class="form-row">
              <label>Схема</label>
              <select v-model="batteryScheme" class="form-select">
                <option value="1">1 АКБ</option>
                <option value="2">2 АКБ(СМ18+Х4Е)</option>
                <option value="3">2+2 АКБ(С350)</option>
              </select>
            </div>

            <div v-if="batteryError" class="battery-error">
              {{ batteryError }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="preflight-footer">
        <button 
          v-if="currentStep > 0" 
          class="preflight-btn secondary"
          @click="previousStep"
        >
          &lt; Назад
        </button>
        <button 
          v-if="currentStep < totalSteps - 1"
          class="preflight-btn primary"
          @click="nextStep"
        >
          Далее &gt;
        </button>
        <button 
          v-if="currentStep === totalSteps - 1"
          class="preflight-btn primary"
          @click="completePreflight"
        >
          Завершить
        </button>
        <button 
          class="preflight-btn secondary"
          @click="closeModal"
        >
          Отмена
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close', 'complete'])

// State
const isVisible = ref(props.visible)
const currentStep = ref(0)
const totalSteps = 8

// Connection state
const connectionChecking = ref(false)
const droneConnected = ref(false)

// Parachute state
const parachuteState = ref('closed')
const parachuteDeploying = ref(false)
const parachuteRetracting = ref(false)
const parachuteReleasing = ref(false)
const parachuteStatus = ref('')

// Aileron state
const aileronPosition = ref('neutral')
const aileronTesting = ref(null) // 'up', 'down', 'neutral', или null
const aileronTestResults = ref({
  up: null,    // true = успешно, false = ошибка, null = не проверено
  down: null,
  neutral: null
})
const aileronStatus = ref('')
const aileronStatusClass = ref('')

// PVD state
const pvdCanvas = ref(null)
const pvdData = ref([])
const pvdResetting = ref(false)
const pvdStatus = ref('')
const pvdStatusClass = ref('')
const currentPVDData = ref({
  airspeed: 0,
  groundSpeed: 0,
  verticalSpeed: 0,
  altitude: 0
})
let pvdUpdateInterval = null

// Motor state
const motorThrottle = ref(0)
const isMotorRunning = ref(false)
const motorStatus = ref('')
const motorStatusClass = ref('')
const motorTestResults = ref([])

// Avionics state
const pitch = ref(0)
const roll = ref(0)
const yaw = ref(0)
const avionicsChecking = ref(false)
const avionicsCheckComplete = ref(false)
const avionicsStatus = ref('')
const avionicsStatusClass = ref('')
const avionicsTests = ref({
  pitch: false,
  roll: false,
  yaw: false
})

// Compass state
const isCalibrating = ref(false)
const calibrationProgress = ref(0)
const compassStatus = ref('')
const compassStatusClass = ref('')
const compassCalibrationComplete = ref(false)
const compassCalibrationSuccess = ref(false)

// Battery state
const batteryType = ref('lipo')
const batteryCapacity = ref('22')
const batteryScheme = ref('1')
const batteryError = ref('')
const batteryChecking = ref(false)
const batteryCheckComplete = ref(false)
const batteryStatus = ref('')
const batteryStatusClass = ref('')
const batteryData = ref({
  voltage: 0,
  current: 0,
  remaining: 0
})
const batteryTests = ref({
  voltage: false,
  current: false,
  remaining: false
})

// Step configuration
const stepConfigs = [
  { title: 'Добро пожаловать в мастер предполетных проверок.' },
  { title: 'Проверка парашюта' },
  { title: 'Проверка элеронов' },
  { title: 'Проверка ПВД' },
  { title: 'Проверка двигателя' },
  { title: 'Проверка авионики' },
  { title: 'Проверка магнитометра' },
  { title: 'Установка батарей' }
]

const currentStepConfig = computed(() => stepConfigs[currentStep.value])

// Watch visibility
watch(() => props.visible, (newVal) => {
  isVisible.value = newVal
  if (newVal) {
    currentStep.value = 0
    // Проверяем подключение к дрону
    checkDroneConnection()
    // Запускаем опрос телеметрии
    startTelemetryPolling()
  } else {
    // Останавливаем опрос телеметрии
    stopTelemetryPolling()
  }
})

// Connection check
const checkDroneConnection = async () => {
  connectionChecking.value = true
  droneConnected.value = false
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/telemetry')
    const data = await response.json()
    
    if (data.success && data.connected) {
      droneConnected.value = true
    } else {
      droneConnected.value = false
    }
  } catch (error) {
    droneConnected.value = false
    console.error('❌ Ошибка проверки подключения:', error)
  } finally {
    connectionChecking.value = false
  }
}

// Telemetry polling
let telemetryInterval = null

const startTelemetryPolling = () => {
  if (telemetryInterval) return
  
  telemetryInterval = setInterval(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/preflight/telemetry')
      const data = await response.json()
      
      if (data.success && data.connected) {
        // Обновляем статус подключения
        droneConnected.value = true
        
        // Обновляем Pitch/Roll/Yaw
        pitch.value = parseFloat(data.attitude.pitch) || 0
        roll.value = parseFloat(data.attitude.roll) || 0
        yaw.value = parseFloat(data.attitude.yaw) || 0
      } else {
        droneConnected.value = false
      }
    } catch (error) {
      // При ошибке считаем что не подключено
      droneConnected.value = false
    }
  }, 500) // Каждые 500ms
}

const stopTelemetryPolling = () => {
  if (telemetryInterval) {
    clearInterval(telemetryInterval)
    telemetryInterval = null
  }
}

// Methods
const closeModal = () => {
  stopPVDUpdates()
  isVisible.value = false
  emit('close')
}

const nextStep = () => {
  if (currentStep.value < totalSteps - 1) {
    // Stop PVD updates when leaving step 3
    if (currentStep.value === 3) {
      stopPVDUpdates()
    }
    
    currentStep.value++
    
    // Initialize PVD chart and start updates when entering step 3
    if (currentStep.value === 3) {
      nextTick(() => {
        initPVDChart()
        startPVDUpdates()
      })
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    // Stop PVD updates when leaving step 3
    if (currentStep.value === 3) {
      stopPVDUpdates()
    }
    
    currentStep.value--
  }
}

const completePreflight = async () => {
  // Validate battery settings
  if (!batteryType.value || !batteryCapacity.value || !batteryScheme.value) {
    batteryError.value = 'Ошибка'
    return
  }
  
  batteryError.value = ''
  
  // Если дрон подключен, отправляем настройки
  if (droneConnected.value) {
    try {
      // Отправляем настройки батареи на дрон
      const response = await fetch('http://localhost:3001/api/preflight/battery/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: batteryType.value,
          capacity: parseInt(batteryCapacity.value),
          cells: parseInt(batteryScheme.value)
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
      } else {
        console.warn('⚠️ Не удалось сохранить настройки батареи:', result.message)
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек батареи:', error)
    }
  } else {
  }
  
  emit('complete', {
    parachute: parachuteState.value,
    aileron: aileronPosition.value,
    battery: {
      type: batteryType.value,
      capacity: batteryCapacity.value,
      scheme: batteryScheme.value
    }
  })
  closeModal()
}

// Parachute methods
const deployParachute = async () => {
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен')
    return
  }
  
  parachuteDeploying.value = true
  parachuteStatus.value = ''
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/parachute/deploy', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
      parachuteState.value = 'deployed'
      parachuteStatus.value = '✅ ' + result.message
    } else {
      parachuteStatus.value = '❌ ' + result.message
    }
  } catch (error) {
    console.error('Ошибка выброса парашюта:', error)
    parachuteStatus.value = '❌ Ошибка подключения к серверу'
  } finally {
    parachuteDeploying.value = false
  }
}

const retractParachute = async () => {
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен')
    return
  }
  
  parachuteRetracting.value = true
  parachuteStatus.value = ''
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/parachute/retract', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
      parachuteState.value = 'closed'
      parachuteStatus.value = '✅ ' + result.message
    } else {
      parachuteStatus.value = '❌ ' + result.message
    }
  } catch (error) {
    console.error('Ошибка закрытия парашюта:', error)
    parachuteStatus.value = '❌ Ошибка подключения к серверу'
  } finally {
    parachuteRetracting.value = false
  }
}

const releaseParachute = async () => {
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен')
    return
  }
  
  // Запрашиваем подтверждение, так как это необратимая операция
  if (!confirm('⚠️ ВНИМАНИЕ! Отцеп парашюта - необратимая операция. Продолжить?')) {
    return
  }
  
  parachuteReleasing.value = true
  parachuteStatus.value = ''
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/parachute/release', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
      parachuteState.value = 'released'
      parachuteStatus.value = '✅ ' + result.message
    } else {
      parachuteStatus.value = '❌ ' + result.message
    }
  } catch (error) {
    console.error('Ошибка отцепа парашюта:', error)
    parachuteStatus.value = '❌ Ошибка подключения к серверу'
  } finally {
    parachuteReleasing.value = false
  }
}

// Aileron methods
const testAileronPosition = async (position) => {
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен')
    return
  }
  
  aileronTesting.value = position
  aileronStatus.value = ''
  aileronStatusClass.value = ''
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/aileron/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position })
    })
    
    const result = await response.json()
    
    if (result.success) {
      aileronPosition.value = position
      aileronTestResults.value[position] = result.verified
      
      if (result.verified) {
        aileronStatus.value = `✅ ${result.message} (Roll: ${result.currentRoll}°, PWM: ${result.pwmValue})`
        aileronStatusClass.value = 'success'
      } else {
        aileronStatus.value = `⚠️ ${result.message} - Проверьте работу сервопривода (Roll: ${result.currentRoll}°)`
        aileronStatusClass.value = 'warning'
      }
    } else {
      aileronTestResults.value[position] = false
      aileronStatus.value = `❌ ${result.message}`
      aileronStatusClass.value = 'error'
    }
  } catch (error) {
    console.error('Ошибка проверки элеронов:', error)
    aileronTestResults.value[position] = false
    aileronStatus.value = '❌ Ошибка подключения к серверу'
    aileronStatusClass.value = 'error'
  } finally {
    aileronTesting.value = null
  }
}

// PVD methods
const initPVDChart = () => {
  if (!pvdCanvas.value) return
  
  const ctx = pvdCanvas.value.getContext('2d')
  
  // Clear canvas
  ctx.clearRect(0, 0, 460, 300)
  
  // Draw axes
  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 1
  
  // Y-axis
  ctx.beginPath()
  ctx.moveTo(40, 20)
  ctx.lineTo(40, 280)
  ctx.stroke()
  
  // X-axis
  ctx.beginPath()
  ctx.moveTo(40, 280)
  ctx.lineTo(440, 280)
  ctx.stroke()
  
  // Y-axis labels (0-100 км/ч)
  ctx.fillStyle = '#cbd5e0'
  ctx.font = '11px Arial'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 100; i += 25) {
    const y = 280 - (i / 100 * 260)
    ctx.fillText(i, 35, y + 4)
    
    // Grid lines
    ctx.strokeStyle = '#2d3748'
    ctx.beginPath()
    ctx.moveTo(40, y)
    ctx.lineTo(440, y)
    ctx.stroke()
  }
  
  // X-axis label
  ctx.textAlign = 'center'
  ctx.fillStyle = '#cbd5e0'
  ctx.fillText('Воздушная скорость (км/ч)', 240, 295)
  
  // Draw data if available
  if (pvdData.value.length > 0) {
    ctx.strokeStyle = '#4a90e2'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    pvdData.value.forEach((point, index) => {
      const x = 40 + (index / Math.max(pvdData.value.length - 1, 1)) * 400
      const y = 280 - (point / 100) * 260
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
  }
}

const resetPVDCalibration = async () => {
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен')
    return
  }
  
  pvdResetting.value = true
  pvdStatus.value = ''
  pvdStatusClass.value = ''
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/pvd/reset', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
      pvdStatus.value = `✅ ${result.message}`
      pvdStatusClass.value = 'success'
      pvdData.value = []
      initPVDChart()
    } else {
      pvdStatus.value = `❌ ${result.message}`
      pvdStatusClass.value = 'error'
    }
  } catch (error) {
    console.error('Ошибка сброса ПВД:', error)
    pvdStatus.value = '❌ Ошибка подключения к серверу'
    pvdStatusClass.value = 'error'
  } finally {
    pvdResetting.value = false
  }
}

const startPVDUpdates = () => {
  if (pvdUpdateInterval) return
  
  pvdUpdateInterval = setInterval(async () => {
    if (!droneConnected.value) return
    
    try {
      const response = await fetch('http://localhost:3001/api/preflight/pvd/data')
      const result = await response.json()
      
      if (result.success) {
        currentPVDData.value = {
          airspeed: result.airspeed || 0,
          groundSpeed: result.groundSpeed || 0,
          verticalSpeed: result.verticalSpeed || 0,
          altitude: result.altitude || 0
        }
        
        // Добавляем данные на график
        pvdData.value.push(result.airspeed || 0)
        
        // Ограничиваем количество точек
        if (pvdData.value.length > 50) {
          pvdData.value.shift()
        }
        
        // Обновляем график
        initPVDChart()
      }
    } catch (error) {
      // Игнорируем ошибки
    }
  }, 500) // Обновление каждые 500ms
}

const stopPVDUpdates = () => {
  if (pvdUpdateInterval) {
    clearInterval(pvdUpdateInterval)
    pvdUpdateInterval = null
  }
}

// Motor methods
const toggleMotor = async () => {
  if (isMotorRunning.value) return
  
  // Проверяем подключение
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен. Подключитесь к дрону через настройки автопилота.')
    return
  }
  
  isMotorRunning.value = true
  motorThrottle.value = 0
  motorStatus.value = ''
  motorStatusClass.value = ''
  motorTestResults.value = []
  
  try {
    const results = []
    
    // Тестируем моторы по очереди
    for (let motor = 1; motor <= 4; motor++) {
      motorStatus.value = `Проверка мотора ${motor}/4...`
      
      // Плавно увеличиваем throttle
      for (let throttle = 0; throttle <= 20; throttle += 2) {
        motorThrottle.value = (motor - 1) * 25 + (throttle / 20) * 25 // 0-100%
        
        // Отправляем команду на сервер и получаем результат
        const response = await fetch('http://localhost:3001/api/preflight/motor/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            motorNumber: motor,
            throttle: throttle,
            duration: 100
          })
        })
        
        const result = await response.json()
        
        // Сохраняем результат для последнего (максимального) throttle каждого мотора
        if (throttle === 20 && result.success) {
          results.push({
            motorNumber: motor,
            success: result.verified,
            message: result.message,
            rollChange: result.rollChange,
            pitchChange: result.pitchChange
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    motorThrottle.value = 100
    motorTestResults.value = results
    
    // Проверяем общий результат
    const allSuccess = results.every(r => r.success)
    const allFailed = results.every(r => !r.success)
    
    if (allSuccess) {
      motorStatus.value = '✅ Все моторы работают исправно'
      motorStatusClass.value = 'success'
    } else if (allFailed) {
      motorStatus.value = '❌ Моторы не работают - проверьте подключение'
      motorStatusClass.value = 'error'
    } else {
      motorStatus.value = '⚠️ Некоторые моторы не прошли проверку'
      motorStatusClass.value = 'warning'
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } catch (error) {
    console.error('Ошибка теста двигателя:', error)
    motorStatus.value = '❌ Ошибка подключения к серверу'
    motorStatusClass.value = 'error'
  } finally {
    isMotorRunning.value = false
    motorThrottle.value = 0
  }
}

// Avionics methods
const adjustPitch = (delta) => {
  pitch.value += delta
  pitch.value = Math.round(pitch.value * 10) / 10
}

const adjustRoll = (delta) => {
  roll.value += delta
  roll.value = Math.round(roll.value * 10) / 10
}

const checkAvionics = async () => {
  if (avionicsChecking.value) return
  
  // Проверяем подключение
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен. Подключитесь к дрону через настройки автопилота.')
    return
  }
  
  avionicsChecking.value = true
  avionicsCheckComplete.value = false
  avionicsStatus.value = 'Проверка авионики...'
  avionicsStatusClass.value = ''
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/avionics/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (data.success) {
      avionicsTests.value = data.tests
      
      const allPassed = data.tests.pitch && data.tests.roll && data.tests.yaw
      
      if (allPassed) {
        avionicsStatus.value = '✓ Авионика работает корректно'
        avionicsStatusClass.value = 'success'
      } else {
        const failedTests = []
        if (!data.tests.pitch) failedTests.push('тангаж')
        if (!data.tests.roll) failedTests.push('крен')
        if (!data.tests.yaw) failedTests.push('рыскание')
        
        avionicsStatus.value = `⚠ Проблемы: ${failedTests.join(', ')}`
        avionicsStatusClass.value = 'error'
      }
      
      avionicsCheckComplete.value = true
    } else {
      avionicsStatus.value = `✗ Ошибка проверки: ${data.message || 'Неизвестная ошибка'}`
      avionicsStatusClass.value = 'error'
    }
  } catch (error) {
    console.error('Ошибка проверки авионики:', error)
    avionicsStatus.value = '✗ Ошибка подключения к серверу'
    avionicsStatusClass.value = 'error'
  } finally {
    avionicsChecking.value = false
  }
}

// Compass methods
const startCompassCalibration = async () => {
  if (isCalibrating.value) return
  
  // Проверяем подключение
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен. Подключитесь к дрону через настройки автопилота.')
    return
  }
  
  // Сбрасываем предыдущие результаты
  compassCalibrationComplete.value = false
  compassCalibrationSuccess.value = false
  compassStatus.value = ''
  compassStatusClass.value = ''
  
  try {
    // Отправляем команду калибровки на сервер
    const response = await fetch('http://localhost:3001/api/preflight/compass/calibrate', {
      method: 'POST'
    })
    
    const result = await response.json()
    
    if (result.success) {
      isCalibrating.value = true
      calibrationProgress.value = 0
      compassStatus.value = 'Медленно вращайте дрон вокруг всех осей...'
      compassStatusClass.value = ''
      
      // Опрашиваем статус калибровки каждые 200ms
      const statusInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch('http://localhost:3001/api/preflight/compass/status')
          const status = await statusResponse.json()
          
          if (status.success) {
            calibrationProgress.value = status.progress || 0
            
            if (status.status === 'completed') {
              clearInterval(statusInterval)
              calibrationProgress.value = 100
              isCalibrating.value = false
              compassCalibrationComplete.value = true
              compassCalibrationSuccess.value = true
              compassStatus.value = '✅ Калибровка завершена успешно'
              compassStatusClass.value = 'success'
              setTimeout(() => {
                calibrationProgress.value = 0
              }, 2000)
            } else if (status.status === 'failed') {
              clearInterval(statusInterval)
              isCalibrating.value = false
              calibrationProgress.value = 0
              compassCalibrationComplete.value = true
              compassCalibrationSuccess.value = false
              compassStatus.value = '❌ Калибровка не удалась - попробуйте снова'
              compassStatusClass.value = 'error'
            } else if (status.status === 'calibrating') {
              compassStatus.value = `Калибровка ${calibrationProgress.value}% - продолжайте вращать дрон...`
            }
          }
        } catch (error) {
          console.error('Ошибка получения статуса калибровки:', error)
        }
      }, 200)
      
      // Таймаут на случай зависания
      setTimeout(() => {
        clearInterval(statusInterval)
        if (isCalibrating.value) {
          isCalibrating.value = false
          calibrationProgress.value = 0
          compassCalibrationComplete.value = true
          compassCalibrationSuccess.value = false
          compassStatus.value = '⚠️ Превышено время ожидания - попробуйте снова'
          compassStatusClass.value = 'warning'
        }
      }, 60000) // 60 секунд максимум
    } else {
      compassStatus.value = '❌ ' + result.message
      compassStatusClass.value = 'error'
    }
  } catch (error) {
    console.error('Ошибка запуска калибровки компаса:', error)
    compassStatus.value = '❌ Ошибка подключения к серверу'
    compassStatusClass.value = 'error'
  }
}

const fixCompassCalibration = () => {
  // Кнопка "Фиксировать" - в будущем можно добавить функционал
  // Пока просто информируем пользователя
  compassStatus.value = 'Продолжайте калибровку...'
}

// Battery methods
const checkBattery = async () => {
  if (batteryChecking.value) return
  
  // Проверяем подключение
  if (!droneConnected.value) {
    alert('⚠️ Дрон не подключен. Подключитесь к дрону через настройки автопилота.')
    return
  }
  
  batteryChecking.value = true
  batteryCheckComplete.value = false
  batteryStatus.value = 'Проверка батареи...'
  batteryStatusClass.value = ''
  
  try {
    const response = await fetch('http://localhost:3001/api/preflight/battery/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (data.success) {
      batteryData.value = data.battery
      batteryTests.value = data.tests
      
      const allPassed = data.tests.voltage && data.tests.current && data.tests.remaining
      
      if (allPassed) {
        batteryStatus.value = '✓ Батарея в отличном состоянии'
        batteryStatusClass.value = 'success'
      } else {
        const failedTests = []
        if (!data.tests.voltage) failedTests.push('низкое напряжение')
        if (!data.tests.current) failedTests.push('высокий ток')
        if (!data.tests.remaining) failedTests.push('низкий заряд')
        
        batteryStatus.value = `⚠ Проблемы: ${failedTests.join(', ')}`
        batteryStatusClass.value = 'error'
      }
      
      batteryCheckComplete.value = true
    } else {
      batteryStatus.value = `✗ Ошибка проверки: ${data.message || 'Неизвестная ошибка'}`
      batteryStatusClass.value = 'error'
    }
  } catch (error) {
    console.error('Ошибка проверки батареи:', error)
    batteryStatus.value = '✗ Ошибка подключения к серверу'
    batteryStatusClass.value = 'error'
  } finally {
    batteryChecking.value = false
  }
}
</script>

<style scoped src="./PreflightChecks.scss"></style>

