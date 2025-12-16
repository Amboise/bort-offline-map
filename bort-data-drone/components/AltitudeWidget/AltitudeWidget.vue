<template>
  <div class="altitude-widget" :class="{'altitude-widget--disconnected': !isConnected}">
    <div class="altitude-widget__scale">
      <div class="altitude-widget__scale-track">
        <div 
          class="altitude-widget__scale-indicator" 
          :style="scaleIndicatorStyle"
        ></div>
        
        <div class="altitude-widget__scale-marks">
          <div 
            v-for="mark in scaleMarks" 
            :key="mark"
            class="altitude-widget__scale-mark"
            :class="{ 'altitude-widget__scale-mark--major': mark % 50 === 0 }"
          >
            <span v-if="mark % 50 === 0" class="altitude-widget__scale-label">{{ mark }}м</span>
          </div>
        </div>
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

// Стабильная высота с округлением
const stableAltitude = ref(0)

watch(() => props.droneData?.gps?.alt, (newAlt) => {
  const alt = Number(newAlt) || 0
  stableAltitude.value = Math.round(alt * 10) / 10 // Округляем до 0.1м
}, { immediate: true })

const altitudeValue = computed(() => stableAltitude.value.toFixed(1))

// Вертикальная скорость (climb rate)
const stableClimbRate = ref(0)

watch(() => props.droneData?.velocity?.vz, (newVz) => {
  const vz = Number(newVz) || 0
  stableClimbRate.value = Math.round(vz * 10) / 10
}, { immediate: true })

const verticalSpeedIcon = computed(() => {
  const speed = stableClimbRate.value
  if (speed > 0.5) return '↑'
  if (speed < -0.5) return '↓'
  return '→'
})

const verticalSpeedClass = computed(() => ({
  'altitude-widget__vspeed--up': stableClimbRate.value > 0.5,
  'altitude-widget__vspeed--down': stableClimbRate.value < -0.5,
  'altitude-widget__vspeed--stable': Math.abs(stableClimbRate.value) <= 0.5
}))

// Шкала высоты (от 0 до 200м)
const maxAltitude = 200
const scaleMarks = computed(() => {
  const marks = []
  for (let i = 0; i <= maxAltitude; i += 10) {
    marks.push(i)
  }
  return marks.reverse() // Переворачиваем, чтобы 0 был внизу
})

// Положение индикатора на шкале
const scaleIndicatorStyle = computed(() => {
  const alt = Math.max(0, Math.min(stableAltitude.value, maxAltitude))
  const percentage = (alt / maxAltitude) * 100
  return {
    bottom: `${percentage}%`
  }
})
</script>

<style scoped>
@import './AltitudeWidget.scss';
</style>

