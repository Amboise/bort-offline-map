<template>
  <div class="flight-hud" :class="{'flight-hud--disconnected': !isConnected}">
    <!-- Статус ARM/DISARM -->
    <div class="flight-hud__arm-status" :class="armStatusClass">
      <div class="flight-hud__arm-icon">{{ armIcon }}</div>
      <div class="flight-hud__arm-text">{{ armText }}</div>
    </div>

    <!-- Тестовые данные для отображения -->
    <div class="flight-hud__row">
      <div class="flight-hud__block">
        <div class="flight-hud__label">Курс</div>
        <div class="flight-hud__value">{{ headingText }}</div>
      </div>
      <div class="flight-hud__block">
        <div class="flight-hud__label">Высота</div>
        <div class="flight-hud__value">{{ altitudeText }}</div>
      </div>
      <div class="flight-hud__block">
        <div class="flight-hud__label">Заряд</div>
        <div class="flight-hud__value" :class="batteryClass">{{ batteryText }}</div>
      </div>
    </div>

    <!-- Искусственный горизонт (сферический) -->
    <div class="flight-hud__att">
      <div class="flight-hud__sphere" :style="sphereStyle">
        <div class="flight-hud__sky" :style="skyStyle"></div>
        <div class="flight-hud__ground" :style="groundStyle"></div>
        <div class="flight-hud__horizon-line" :style="horizonLineStyle"></div>
        <div class="flight-hud__pitch-lines" :style="pitchLinesStyle">
          <div 
            class="flight-hud__pitch-line" 
            v-for="angle in pitchLines" 
            :key="angle" 
            :style="getPitchLineStyle(angle)"
          >
            <span class="flight-hud__pitch-label flight-hud__pitch-label--left">
              {{ angle > 0 ? `+${angle}` : `${angle}` }}
            </span>
            <span class="flight-hud__pitch-label flight-hud__pitch-label--right">
              {{ angle > 0 ? `+${angle}` : `${angle}` }}
            </span>
          </div>
        </div>
      </div>
      <div class="flight-hud__aircraft">
        <div class="flight-hud__wings"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  droneData: {
    type: Object,
    default: () => null
  }
})

const isConnected = computed(() => !!props.droneData?.isConnected)

// Стабильные значения с дебаунсингом (обновляются реже)
const stableHeading = ref(0)
const stableAltitude = ref(0)
const stableBattery = ref(0)

// Heading (yaw 0..360) - обновляется с округлением
watch(() => props.droneData?.attitude?.yaw, (newYaw) => {
  const yaw = newYaw ?? 0
  let deg = Number(yaw)
  if (Number.isNaN(deg)) deg = 0
  deg = ((deg % 360) + 360) % 360
  stableHeading.value = Math.round(deg)
}, { immediate: true })

const headingText = computed(() => `${String(stableHeading.value).padStart(3, '0')}°`)

// Altitude - обновляется с округлением до 0.1м
watch(() => props.droneData?.gps?.alt, (newAlt) => {
  const alt = Number(newAlt) || 0
  stableAltitude.value = Math.round(alt * 10) / 10 // Округляем до 0.1м
}, { immediate: true })

const altitudeText = computed(() => `${stableAltitude.value.toFixed(1)} м`)

// Battery - обновляется с дебаунсингом для стабильности
let batteryUpdateTimer = null
watch(() => props.droneData?.battery?.remaining, (newBattery) => {
  const battery = Number(newBattery) || 0
  const rounded = Math.round(battery)
  
  // Обновляем только если разница больше 1%
  if (Math.abs(rounded - stableBattery.value) >= 2) {
    // Значительное изменение - обновляем сразу
    stableBattery.value = rounded
  } else if (Math.abs(rounded - stableBattery.value) >= 1) {
    // Небольшое изменение - обновляем с задержкой для фильтрации колебаний
    if (batteryUpdateTimer) clearTimeout(batteryUpdateTimer)
    batteryUpdateTimer = setTimeout(() => {
      stableBattery.value = rounded
    }, 2000) // Задержка 2 секунды для фильтрации колебаний
  }
}, { immediate: true })

const batteryText = computed(() => `${stableBattery.value}%`)
const batteryClass = computed(() => ({
  'flight-hud__value--critical': stableBattery.value < 20,
  'flight-hud__value--warning': stableBattery.value >= 20 && stableBattery.value < 50,
  'flight-hud__value--good': stableBattery.value >= 50
}))

// Attitude
const roll = computed(() => props.droneData?.attitude?.roll ?? 0) // Тестовое значение
const pitch = computed(() => {
  // Если есть реальные данные, используем их, иначе нулевое значение
  const realPitch = props.droneData?.attitude?.pitch
  return realPitch !== undefined ? realPitch : 0
})

// ARM/DISARM статус
const isArmed = computed(() => props.droneData?.system?.armed ?? false)
const armText = computed(() => isArmed.value ? 'ARMED' : 'DISARMED')
const armIcon = computed(() => isArmed.value ? '✅' : '❌')
const armStatusClass = computed(() => ({
  'flight-hud__arm-status--armed': isArmed.value,
  'flight-hud__arm-status--disarmed': !isArmed.value
}))

// Сферический поворот: сфера поворачивается в противоположную сторону от самолёта
// ИСПРАВЛЕНО: используем положительный roll (без минуса)
const sphereStyle = computed(() => ({
  transform: `rotateZ(${roll.value}deg)`
}))

// Стили для внутренних элементов сферы (движутся в зависимости от тангажа)
const skyStyle = computed(() => ({
  transform: `translateY(${-pitch.value * 1.0}px)`
}))

const groundStyle = computed(() => ({
  transform: `translateY(${-pitch.value * 1.0}px)`
}))

const pitchLinesStyle = computed(() => ({
  transform: `translateY(${-pitch.value * 1.0}px)`
}))

const horizonLineStyle = computed(() => ({
  transform: `translateY(${-pitch.value * 1.0}px)`
}))

// Индикатор крена убран по запросу пользователя

// Линии тангажа (каждые 10 градусов)
const pitchLines = computed(() => [-30, -20, -10, 10, 20, 30])

// Кэшированные стили для каждой линии тангажа
const pitchLineStyles = computed(() => {
  const styles = {}
  const currentPitch = pitch.value
  
  
  pitchLines.value.forEach(angle => {
    // Ширина линии уменьшается от центра к полюсам
    const maxWidth = 80
    const minWidth = 20
    const width = maxWidth - Math.abs(angle) * 1.5
    
    // Вертикальное смещение (увеличиваем расстояния между линиями)
    const offset = angle * 1.5
    
    // Определяем видимость линии в зависимости от текущего тангажа
    let opacity = 0
    
    // Временно делаем все линии видимыми для тестирования
    opacity = 1
    // Отладочная информация для каждой линии
    
    styles[angle] = {
      transform: `translate(-50%, -50%) translateY(${offset}px)`,
      opacity: opacity,
      '--pitch-width': `${Math.max(width, minWidth)}px`,
      // Добавляем will-change для оптимизации анимаций
      willChange: 'opacity, transform'
    }
  })
  
  return styles
})

// Стили для линий тангажа (ёлочкой от центра к полюсам)
const getPitchLineStyle = (angle) => {
  return pitchLineStyles.value[angle] || {}
}
</script>

<style scoped>
@import './FlightHud.scss';
</style>


