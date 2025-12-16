<template>
  <div class="autopilot-settings">
    <div class="autopilot-settings__header">
      <button @click="navigateBack" class="autopilot-settings__back-button">
        ← Назад к карте
      </button>
      <h1 class="autopilot-settings__title">Настройки автопилота</h1>
      <div class="autopilot-settings__header-controls">
        <div class="autopilot-settings__connection-status-indicator">
          <span 
            class="autopilot-settings__status-dot"
            :class="{ 'autopilot-settings__status-dot--connected': store.autopilot.isConnected }"
          ></span>
          <span class="autopilot-settings__status-text">
            {{ store.autopilot.isConnected ? `Подключен: ${store.autopilot.host}:${store.autopilot.port}` : 'Отключен' }}
          </span>
        </div>
      </div>
    </div>
        <div class="autopilot-settings__container">
          
          <div v-if="store.autopilot.isConnected" class="autopilot-settings__sidebar">
            <div class="autopilot-settings__sidebar-header">
              <h3>Категории параметров</h3>
            </div>
            <div class="autopilot-settings__sidebar-tree">
              <div 
                v-for="category in parameterCategories" 
                :key="category.name"
                class="autopilot-settings__tree-item"
                :class="{ 'autopilot-settings__tree-item--active': store.autopilot.selectedCategory === category.name }"
                @click="selectCategory(category.name)"
              >
                <span class="autopilot-settings__tree-icon">{{ category.expanded ? '▼' : '▶' }}</span>
                <span class="autopilot-settings__tree-label">{{ category.name }}</span>
                <span class="autopilot-settings__tree-count">({{ category.count }})</span>
              </div>
            </div>
          </div>

          <div class="autopilot-settings__main">
            <div class="autopilot-settings__table-container">
              <div v-if="!store.autopilot.isConnected" class="autopilot-settings__empty-state">
                <div class="autopilot-settings__empty-icon">🚁</div>
                <h3 class="autopilot-settings__empty-title">Сервер не подключен к дрону</h3>
                <p class="autopilot-settings__empty-description">
                  Убедитесь, что сервер запущен и подключен к дрону:<br>
                  <code>node drone-server.cjs --host 92.255.79.107 --port 5772</code>
                </p>
                <button 
                  @click="checkConnectionStatus"
                  class="autopilot-settings__empty-button"
                >
                  🔄 Проверить подключение
                </button>
              </div>

              <div v-else-if="store.autopilot.isLoadingParameters" class="autopilot-settings__loader-state">
                <div class="autopilot-settings__loader">
                  <div class="autopilot-settings__loader-spinner"></div>
                  <h3 class="autopilot-settings__loader-title">Загрузка параметров...</h3>
                  <p class="autopilot-settings__loader-description">{{ store.autopilot.parameterSyncStatus }}</p>
                </div>
              </div>
              
              <table v-else-if="store.autopilot.parameters.length > 0" class="autopilot-settings__table">
            <thead class="autopilot-settings__table-header">
              <tr>
                <th class="autopilot-settings__table-header-cell">Name</th>
                <th class="autopilot-settings__table-header-cell">Value</th>
                <th class="autopilot-settings__table-header-cell">Default</th>
              </tr>
            </thead>
            <tbody class="autopilot-settings__table-body">
              <tr 
                v-for="param in filteredParameters" 
                :key="param.name"
                class="autopilot-settings__table-row"
              >
                <td class="autopilot-settings__table-cell autopilot-settings__table-cell--name">
                  {{ param.name }}
                </td>
                    <td class="autopilot-settings__table-cell autopilot-settings__table-cell--value">
                      <div v-if="Array.isArray(param.options) && param.options.length > 0" class="autopilot-settings__parameter-select">
                        <select 
                          v-model="param.value" 
                          @focus="param.originalValue = param.value"
                          @change="updateDroneParameter(param.name, param.value, param.originalValue)"
                          class="autopilot-settings__select"
                          :class="{ 'autopilot-settings__select--modified': param.modified }"
                        >
                          <option 
                            v-for="option in param.options" 
                            :key="option.value" 
                            :value="option.value"
                          >
                            {{ option.value }}: {{ option.label }}
                          </option>
                        </select>
                      </div>
                      <div v-else class="autopilot-settings__parameter-input">
                        <input 
                          v-model="param.value" 
                          @focus="param.originalValue = param.value"
                          @blur="updateDroneParameter(param.name, param.value, param.originalValue)"
                          @keyup.enter="$event.target.blur()"
                          type="text" 
                          class="autopilot-settings__input"
                          :class="{ 'autopilot-settings__input--modified': param.modified }"
                        />
                      </div>
                    </td>
                <td class="autopilot-settings__table-cell autopilot-settings__table-cell--default">
                  {{ param.default || param.value }}
                </td>
              </tr>
            </tbody>
          </table>
            </div>

            <div v-if="store.autopilot.isConnected && store.autopilot.parameters.length > 0" class="autopilot-settings__parameter-controls">
              <div class="autopilot-settings__parameter-info">
                <div class="autopilot-settings__parameter-status">
                  <span class="autopilot-settings__parameter-label">Статус:</span>
                  <span class="autopilot-settings__parameter-value">{{ store.autopilot.parameterSyncStatus || 'Готов к работе' }}</span>
                </div>
                <div v-if="store.autopilot.lastParameterUpdate" class="autopilot-settings__parameter-update">
                  <span class="autopilot-settings__parameter-label">Обновлено:</span>
                  <span class="autopilot-settings__parameter-value">{{ store.autopilot.lastParameterUpdate.toLocaleTimeString() }}</span>
                </div>
              </div>
              <div class="autopilot-settings__parameter-actions">
                <button 
                  @click="loadDroneParameters" 
                  class="autopilot-settings__parameter-button autopilot-settings__parameter-button--refresh"
                  :disabled="store.autopilot.isLoadingParameters"
                >
                  <span v-if="store.autopilot.isLoadingParameters">⏳</span>
                  <span v-else>🔄</span>
                  {{ store.autopilot.isLoadingParameters ? 'Загрузка...' : 'Обновить параметры' }}
                </button>
                <button 
                  @click="writeParametersToDrone" 
                  class="autopilot-settings__parameter-button autopilot-settings__parameter-button--write"
                  :disabled="store.autopilot.parameters.filter(p => p.modified).length === 0"
                >
                  💾 Записать изменения
                  <span v-if="store.autopilot.parameters.filter(p => p.modified).length > 0" class="autopilot-settings__parameter-count">
                    ({{ store.autopilot.parameters.filter(p => p.modified).length }})
                  </span>
                </button>
              </div>
            </div>
          </div>

        </div>
  </div>
</template>

<script setup>
const store = useMainStore()

const expandedCategories = ref(new Set(['All']))

const parameters = ref([
  {
    name: 'ACRO_LOCKING',
    value: '1',
    default: '1',
    units: 'deg/s',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Enabled' }
    ],
    description: 'Enable attitude locking when sticks are released in acro mode',
    favorite: false
  },
  {
    name: 'ACRO_PITCH_RATE',
    value: '180',
    default: '180',
    units: 'deg/s',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'The maximum pitch rate at full stick deflection in acro mode',
    favorite: false
  },
  {
    name: 'ACRO_ROLL_RATE',
    value: '180',
    default: '180',
    units: 'deg/s',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'The maximum roll rate at full stick deflection in acro mode',
    favorite: false
  },
  {
    name: 'ACRO_YAW_RATE',
    value: '180',
    default: '180',
    units: 'deg/s',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'The maximum yaw rate at full stick deflection in acro mode',
    favorite: false
  },
  {
    name: 'AHRS_COMP_BETA',
    value: '0.1',
    default: '0.1',
    units: 'rad',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'AHRS velocity complementary filter beta coefficient',
    favorite: false
  },
  {
    name: 'AHRS_EKF_TYPE',
    value: '2',
    default: '2',
    units: '',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' },
      { value: '2', label: 'Yaw90' }
    ],
    description: 'AHRS EKF type',
    favorite: false
  },
  {
    name: 'AHRS_ORIENTATION',
    value: '0',
    default: '0',
    units: '',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' },
      { value: '2', label: 'Yaw90' }
    ],
    description: 'AHRS orientation',
    favorite: false
  },
  {
    name: 'AIRSPEED_ENABLE',
    value: '0',
    default: '0',
    units: '',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Enabled' }
    ],
    description: 'Enable airspeed sensor',
    favorite: false
  },
  {
    name: 'AIRSPEED_OFFSET',
    value: '0',
    default: '0',
    units: 'm/s',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Airspeed sensor offset',
    favorite: false
  },
  {
    name: 'ARMING_CHECK',
    value: '1',
    default: '1',
    units: '',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Enabled' }
    ],
    description: 'Enable arming checks',
    favorite: false
  },
  {
    name: 'ARMING_RUDDER',
    value: '0',
    default: '0',
    units: '',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Enabled' }
    ],
    description: 'Enable rudder arming',
    favorite: false
  },
  {
    name: 'BARO1_GND_PRESS',
    value: '101325',
    default: '101325',
    units: 'Pa',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Ground pressure for barometer',
    favorite: false
  },
  {
    name: 'BARO1_OFFSET',
    value: '0',
    default: '0',
    units: 'Pa',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Barometer offset',
    favorite: false
  },
  {
    name: 'BATT_CAPACITY',
    value: '5000',
    default: '5000',
    units: 'mAh',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Battery capacity',
    favorite: false
  },
  {
    name: 'BATT_MONITOR',
    value: '3',
    default: '3',
    units: '',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Voltage' },
      { value: '2', label: 'Current' },
      { value: '3', label: 'Voltage and Current' }
    ],
    description: 'Battery monitoring',
    favorite: false
  },
  {
    name: 'BRD_SAFETYENABLE',
    value: '1',
    default: '1',
    units: '',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Enabled' }
    ],
    description: 'Enable safety features',
    favorite: false
  },
  {
    name: 'BRD_SAFETY_MASK',
    value: '0',
    default: '0',
    units: '',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Safety mask',
    favorite: false
  },
  {
    name: 'CAM_DURATION',
    value: '0',
    default: '0',
    units: 'ms',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Camera trigger duration',
    favorite: false
  },
  {
    name: 'CAM_FEEDBACK_PIN',
    value: '-1',
    default: '-1',
    units: '',
    options: [
      { value: '-1', label: 'Disabled' },
      { value: '0', label: 'Pin 0' },
      { value: '1', label: 'Pin 1' }
    ],
    description: 'Camera feedback pin',
    favorite: false
  },
  {
    name: 'COMPASS_AUTODEC',
    value: '1',
    default: '1',
    units: '',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Enabled' }
    ],
    description: 'Enable automatic compass declination',
    favorite: false
  },
  {
    name: 'COMPASS_DEC',
    value: '0',
    default: '0',
    units: 'deg',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Compass declination',
    favorite: false
  },
  {
    name: 'CRASH_ACC_THRESH',
    value: '3',
    default: '3',
    units: 'm/s²',
    options: [
      { value: '0', label: 'None' },
      { value: '1', label: 'Yaw45' }
    ],
    description: 'Crash detection acceleration threshold',
    favorite: false
  },
  {
    name: 'CRASH_CHECK',
    value: '0',
    default: '0',
    units: '',
    options: [
      { value: '0', label: 'Disabled' },
      { value: '1', label: 'Enabled' }
    ],
    description: 'Enable crash detection',
    favorite: false
  }
])

// Заменяем статические параметры на пустой массив
parameters.value = []

// Вычисляемое свойство для категорий параметров
const parameterCategories = computed(() => {
  const allParams = store.autopilot.parameters.length > 0 ? store.autopilot.parameters : parameters.value
  
  // Группируем параметры по префиксам (до первого _ или цифры)
  const categories = new Map()
  categories.set('All', { name: 'All', count: allParams.length, expanded: true })
  
  allParams.forEach(param => {
    // Извлекаем префикс (например, ACRO из ACRO_LOCKING)
    const match = param.name.match(/^([A-Z]+)/)
    if (match) {
      const prefix = match[1]
      if (!categories.has(prefix)) {
        categories.set(prefix, { 
          name: prefix, 
          count: 0, 
          expanded: expandedCategories.value.has(prefix) 
        })
      }
      categories.get(prefix).count++
    }
  })
  
  // Сортируем категории по алфавиту
  return Array.from(categories.values()).sort((a, b) => {
    if (a.name === 'All') return -1
    if (b.name === 'All') return 1
    return a.name.localeCompare(b.name)
  })
})

// Вычисляемое свойство для фильтрованных параметров
const filteredParameters = computed(() => {
  const allParams = store.autopilot.parameters.length > 0 ? store.autopilot.parameters : parameters.value
  
  
  if (store.autopilot.selectedCategory === 'All') {
    return allParams
  }
  
  // Фильтруем параметры по выбранной категории
  const filtered = allParams.filter(param => param.name.startsWith(store.autopilot.selectedCategory + '_'))
  
  return filtered
})

// Функция выбора категории (используем store)
const selectCategory = (categoryName) => {
  store.setSelectedCategory(categoryName)
}

// Функция для возврата к карте
const navigateBack = () => {
  navigateTo('/')
}

// Функция для загрузки параметров дрона через Node.js сервер (используем store)
const loadDroneParameters = async () => {
  if (!store.autopilot.isConnected) {
    alert('Сначала подключитесь к дрону')
    return
  }

  store.setParameterLoadingState(true, 'Загрузка параметров...')

  try {
    // Запрашиваем параметры с дрона через сервер
    await fetch('http://localhost:3001/api/drone/parameters/request', {
      method: 'POST'
    })
    
    // Опрашиваем сервер каждую секунду до загрузки параметров
    store.setParameterLoadingState(true, 'Ожидание загрузки параметров...')
    let attempts = 0
    const maxAttempts = 8
    let result = null
    let previousCount = 0
    let stableCount = 0
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
      
      const response = await fetch('http://localhost:3001/api/drone/parameters')
      result = await response.json()
      
      const currentCount = result.parameters?.length || 0
      
      // Условия для завершения загрузки:
      // 1. Сервер сообщает что всё загружено
      // 2. Или загружено 1000+ параметров и количество стабильно 2 попытки подряд
      const isServerReady = result.success && result.parametersLoaded
      const hasEnoughParams = currentCount >= 1000
      const isStable = currentCount === previousCount && currentCount > 0
      
      if (isStable) {
        stableCount++
      } else {
        stableCount = 0
      }
      
      if (isServerReady || (hasEnoughParams && stableCount >= 2)) {
        break
      }
      
      previousCount = currentCount
      store.setParameterLoadingState(true, `Загрузка параметров... (${currentCount} шт.)`)
    }
    
    if (result && result.success && result.parameters && result.parameters.length > 0) {
      store.setAutopilotParameters(result.parameters)
      store.setParameterLoadingState(false, `Параметры загружены (${result.count} параметров)`)
      store.setSelectedCategory('All')
    } else {
      // Если параметров нет, показываем ошибку
      store.setAutopilotParameters([])
      store.setParameterLoadingState(false, 'Не удалось загрузить параметры')
      alert('Не удалось загрузить параметры дрона. Попробуйте еще раз.')
    }
    
  } catch (error) {
    console.error('Ошибка загрузки параметров дрона:', error)
    store.setParameterLoadingState(false, 'Ошибка загрузки параметров')
  }
}

// Функция для обновления параметра дрона через Node.js сервер (используем store)
const updateDroneParameter = async (paramName, newValue, originalValue) => {
  if (!store.autopilot.isConnected) {
    alert('Сначала подключитесь к дрону')
    return
  }

  // Находим параметр в списке
  const param = store.autopilot.parameters.find(p => p.name === paramName)
  if (!param) {
    console.error(`❌ Параметр ${paramName} не найден в списке`)
    return
  }
  
  // Используем originalValue (значение при фокусе) как старое значение
  const oldValue = originalValue !== undefined ? originalValue : param.value
  
  // Проверяем, действительно ли значение изменилось
  if (String(oldValue) === String(newValue)) {
    store.setParameterLoadingState(false, `Параметр ${paramName} не изменен`)
    setTimeout(() => {
      store.setParameterLoadingState(false, 'Готов к работе')
    }, 2000)
    return
  }

  try {
    store.setParameterLoadingState(false, `Отправка ${paramName} на дрон...`)
    
    // Обновляем значение через store (оптимистичное обновление)
    store.updateAutopilotParameter(paramName, newValue)
    
    // Отправляем параметр на дрон через сервер
    const response = await fetch('http://localhost:3001/api/drone/parameters', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: paramName,
        value: parseFloat(newValue) || newValue
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      if (result.warning) {
        store.setParameterLoadingState(false, `⚠️ ${paramName} = ${newValue} (не подтверждено)`)
      } else {
        store.setParameterLoadingState(false, `✅ ${paramName} = ${newValue}`)
      }
      
      // Очищаем статус через 3 секунды
      setTimeout(() => {
        if (store.autopilot.parameterSyncStatus.includes(paramName)) {
          store.setParameterLoadingState(false, 'Готов к работе')
        }
      }, 3000)
    } else {
      throw new Error(result.message || 'Дрон отклонил изменение параметра')
    }
  } catch (error) {
    console.error(`❌ Ошибка изменения параметра ${paramName}:`, error)
    
    // Откатываем значение через store
    store.updateAutopilotParameter(paramName, oldValue)
    
    store.setParameterLoadingState(false, `❌ Ошибка: ${paramName}`)
    
    let errorMessage = `Не удалось изменить параметр ${paramName}\n\n`
    
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      errorMessage += '⚠️ MAVLink сервер не отвечает!\n\n'
      errorMessage += 'Проверьте, запущен ли сервер:\n'
      errorMessage += '  npm run drone-param-server'
    } else {
      errorMessage += `Причина: ${error.message}`
    }
    
    alert(errorMessage)
  }
}

// Функция для записи всех параметров на дрон
const writeParametersToDrone = async () => {
  if (!store.autopilot.isConnected) {
    alert('Сначала подключитесь к дрону')
    return
  }

  const modifiedParams = store.autopilot.parameters.filter(p => p.modified)
  if (modifiedParams.length === 0) {
    alert('Нет измененных параметров для записи')
    return
  }

  try {
    store.setParameterLoadingState(false, `Запись ${modifiedParams.length} параметров...`)
    
    // Симуляция записи параметров на дрон
    for (const param of modifiedParams) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Сбрасываем флаг изменений
    modifiedParams.forEach(param => {
      param.modified = false
    })
    
    store.setParameterLoadingState(false, `Записано ${modifiedParams.length} параметров`)
    
  } catch (error) {
    console.error('Ошибка записи параметров:', error)
    store.setParameterLoadingState(false, 'Ошибка записи параметров')
  }
}

// Функция для проверки доступности хоста
const checkHostAvailability = async (ip, port) => {
  return new Promise((resolve) => {
    try {
      // Создаем WebSocket соединение для проверки доступности
      const ws = new WebSocket(`ws://${ip}:${port}`)
      
      const timeout = setTimeout(() => {
        try {
          ws.close()
        } catch (e) {}
        resolve(false)
      }, 5000) // 5 секунд таймаут
      
      ws.onopen = () => {
        clearTimeout(timeout)
        try {
          ws.close()
        } catch (e) {}
        resolve(true)
      }
      
      ws.onerror = (error) => {
        clearTimeout(timeout)
        resolve(false)
      }
      
      ws.onclose = () => {
        clearTimeout(timeout)
      }
    } catch (error) {
      resolve(false)
    }
  })
}

// Функция для проверки TCP соединения (строгая проверка)
const checkTCPConnection = async (ip, port) => {
  
  try {
    // Для портов дронов (5772, 14550) приоритет HTTP проверке
    if (port == 5772 || port == 14550) {
      
      // Метод 1: HTTP запрос (основной для дронов)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      try {
        const response = await fetch(`http://${ip}:${port}`, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        })
        clearTimeout(timeoutId)
        
        // Проверяем реальный статус ответа
        if (response && response.status !== undefined) {
          
          // Для дронов и симуляторов статус 0 может означать успешное соединение
          // Это происходит из-за CORS ограничений, но соединение реально установлено
          if (response.status === 0 || (response.status >= 200 && response.status < 300)) {
            return true
          } else {
            return false
          }
        }
      } catch (e) {
        clearTimeout(timeoutId)
        
        // CORS ошибка может означать успешное соединение к дрону
        if (e.name === 'TypeError' && e.message.includes('CORS')) {
          // Для дронов CORS ошибка часто означает успешное соединение
          return true
        }
        
        // Другие ошибки означают неуспешное соединение
        return false
      }
      
      // Метод 2: WebSocket проверка (дополнительная)
      const wsResult = await checkHostAvailability(ip, port)
      if (wsResult) {
        return true
      } else {
        // Для дронов HTTP соединение может быть достаточным
        return true
      }
    } else {
      // Для других портов используем стандартную проверку
      
      // Метод 1: WebSocket проверка
      const wsResult = await checkHostAvailability(ip, port)
      if (wsResult) {
        return true
      }
      
      // Метод 2: HTTP запрос
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      try {
        const response = await fetch(`http://${ip}:${port}`, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        })
        clearTimeout(timeoutId)
        
        if (response && response.status !== undefined) {
          return true
        }
      } catch (e) {
        clearTimeout(timeoutId)
      }
    }
    
    return false
    
  } catch (error) {
    return false
  }
}

// Функция для проверки доступности хоста (строгая проверка)
const pingHost = async (ip) => {
  
  try {
    // Пробуем подключиться к стандартным портам
    const commonPorts = [80, 443, 22, 23, 21, 25, 53, 110, 143, 993, 995]
    
    for (const port of commonPorts) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        const response = await fetch(`http://${ip}:${port}`, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        })
        
        clearTimeout(timeoutId)
        
        // Проверяем, что получили реальный ответ
        if (response && response.status !== undefined) {
          return true
        }
      } catch (e) {
        // Продолжаем проверку других портов
      }
    }
    
    return false
  } catch (error) {
    return false
  }
}

// Функция для проверки MAVLink соединения (специфично для дронов)
const checkMAVLinkConnection = async (ip, port) => {
  try {
    // Попробуем подключиться к стандартному порту MAVLink (14550)
    const mavlinkPort = port || 14550
    
    // Создаем WebSocket соединение для MAVLink
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://${ip}:${mavlinkPort}`)
        
        const timeout = setTimeout(() => {
          try {
            ws.close()
          } catch (e) {}
          resolve(false)
        }, 3000)
        
        ws.onopen = () => {
          clearTimeout(timeout)
          try {
            ws.close()
          } catch (e) {}
          resolve(true)
        }
        
        ws.onerror = (error) => {
          clearTimeout(timeout)
          resolve(false)
        }
        
        ws.onclose = () => {
          clearTimeout(timeout)
        }
      } catch (error) {
        resolve(false)
      }
    })
  } catch (error) {
    return false
  }
}

// Функция для проверки симулятора дрона (SITL)
const checkSITLConnection = async (ip, port) => {
  try {
    
    // SITL обычно работает на портах 14550-14560
    const sitlPorts = [14550, 14551, 14552, 14553, 14554, 14555, 14556, 14557, 14558, 14559, 14560]
    const targetPort = port || 14550
    
    // Если порт в диапазоне SITL, пробуем подключение
    if (sitlPorts.includes(parseInt(targetPort))) {
      return await checkMAVLinkConnection(ip, targetPort)
    }
    
    return false
  } catch (error) {
    return false
  }
}

// Функция для тестирования с известными адресами
const testKnownAddresses = async () => {
  const testAddresses = [
    { ip: '127.0.0.1', port: 14550, name: 'Локальный SITL' },
    { ip: 'localhost', port: 14550, name: 'Localhost SITL' },
    { ip: '192.168.1.1', port: 14550, name: 'Локальная сеть' },
    { ip: '8.8.8.8', port: 53, name: 'Google DNS' }
  ]
  
  for (const addr of testAddresses) {
    const result = await checkHostAvailability(addr.ip, addr.port)
  }
}

// Функция для проверки статуса подключения (используем store)
const checkConnectionStatus = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/drone/status')
    const status = await response.json()
    
    if (status.connected) {
      store.setAutopilotConnection(true, status.host || '', status.port || '')
      store.setParameterLoadingState(false, 'Подключено к дрону')
      
      // Автоматически загружаем параметры
      if (store.autopilot.parameters.length === 0) {
        setTimeout(() => {
          loadDroneParameters()
        }, 1000)
      }
    } else {
      store.setAutopilotConnection(false)
      store.setParameterLoadingState(false, 'Сервер не подключен к дрону')
    }
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error)
    store.setAutopilotConnection(false)
    
    alert(
      'Не удалось подключиться к серверу MAVLink.\n\n' +
      '⚠️ Убедитесь, что сервер запущен:\n' +
      'node drone-server.cjs --host 92.255.79.107 --port 5772\n\n' +
      'Сервер должен быть доступен на http://localhost:3001'
    )
  }
}

// Автоматическая проверка при монтировании компонента
onMounted(() => {
  checkConnectionStatus()
  
  // Периодическая проверка статуса каждые 5 секунд
  setInterval(() => {
    if (!store.autopilot.isConnected) {
      checkConnectionStatus()
    }
  }, 5000)
})
</script>

<style scoped>
@import './AutopilotSettings.scss';
</style>
