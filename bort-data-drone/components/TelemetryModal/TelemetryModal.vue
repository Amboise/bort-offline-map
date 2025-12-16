<template>
  <div class="telemetry-content">
    <div class="telemetry-status-bar">
      <div class="telemetry-status" :class="statusClass">
        {{ connectionStatus }}
      </div>
    </div>
    
    <div class="telemetry-sections">
      <!-- Статус подключения -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🔗 Статус подключения</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Подключение:</span>
            <span class="telemetry-item__value" :class="droneData?.isConnected ? 'status-connected' : 'status-disconnected'">
              {{ droneData?.isConnected ? '✅ Подключен' : '❌ Отключен' }}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Статус системы:</span>
            <span class="telemetry-item__value">{{ droneData?.system?.status || 'UNKNOWN' }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Двигатель:</span>
            <span class="telemetry-item__value" :class="droneData?.system?.armed ? 'status-armed' : 'status-disarmed'">
              {{ droneData?.system?.armed ? '✅ включен' : '❌ выключен' }}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">MAVLink версия:</span>
            <span class="telemetry-item__value">v{{ droneData?.system?.mavlinkVersion || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- GPS данные -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🛰️ GPS данные</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Широта:</span>
            <span class="telemetry-item__value">{{ formatCoordinate(droneData?.gps?.lat) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Долгота:</span>
            <span class="telemetry-item__value">{{ formatCoordinate(droneData?.gps?.lon) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Высота:</span>
            <span class="telemetry-item__value">{{ formatAltitude(droneData?.gps?.alt) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">GPS Fix:</span>
            <span class="telemetry-item__value" :class="getGPSFixClass(droneData?.gps?.fix)">
              {{ getGPSFixText(droneData?.gps?.fix) }}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Спутники:</span>
            <span class="telemetry-item__value">{{ droneData?.gps?.satellitesVisible || 0 }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">HDOP:</span>
            <span class="telemetry-item__value">{{ formatHDOP(droneData?.gps?.hdop) }}</span>
          </div>
        </div>
      </div>

      <!-- Ориентация -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">✈️ Ориентация</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Крен (Roll):</span>
            <span class="telemetry-item__value">{{ formatAngle(droneData?.attitude?.roll) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Тангаж (Pitch):</span>
            <span class="telemetry-item__value">{{ formatAngle(droneData?.attitude?.pitch) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Рыскание (Yaw):</span>
            <span class="telemetry-item__value">{{ formatAngle(droneData?.attitude?.yaw) }}</span>
          </div>
        </div>
      </div>

      <!-- Скорость -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">⚡ Скорость</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Скорость по земле:</span>
            <span class="telemetry-item__value">{{ formatSpeed(droneData?.velocity?.groundSpeed) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Воздушная скорость:</span>
            <span class="telemetry-item__value">{{ formatSpeed(droneData?.velocity?.airSpeed) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Вертикальная скорость:</span>
            <span class="telemetry-item__value">{{ formatSpeed(droneData?.velocity?.verticalSpeed) }}</span>
          </div>
        </div>
      </div>

      <!-- Батарея -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">🔋 Батарея</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Напряжение:</span>
            <span class="telemetry-item__value" :class="getBatteryVoltageClass(droneData?.battery?.voltage)">
              {{ formatVoltage(droneData?.battery?.voltage) }}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Ток:</span>
            <span class="telemetry-item__value">{{ formatCurrent(droneData?.battery?.current) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Остаток:</span>
            <span class="telemetry-item__value" :class="getBatteryRemainingClass(droneData?.battery?.remaining)">
              {{ formatRemaining(droneData?.battery?.remaining) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Статистика -->
      <div class="telemetry-section">
        <h4 class="telemetry-section__title">📈 Статистика</h4>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-item__label">Получено пакетов:</span>
            <span class="telemetry-item__value">{{ stats?.receivedPackets || 0 }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Последний пакет:</span>
            <span class="telemetry-item__value">{{ formatLastPacketTime(stats?.timeSinceLastPacket) }}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-item__label">Активность:</span>
            <span class="telemetry-item__value" :class="stats?.isActive ? 'status-active' : 'status-inactive'">
              {{ stats?.isActive ? '🟢 Активен' : '🔴 Неактивен' }}
            </span>
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
  },
  stats: {
    type: Object,
    default: () => null
  }
})

// Статус подключения
const connectionStatus = computed(() => {
  if (!props.droneData) return 'Ожидание данных...'
  return props.droneData.isConnected ? 'Подключено' : 'Отключено'
})

const statusClass = computed(() => {
  return props.droneData?.isConnected ? 'status-connected' : 'status-disconnected'
})

// Форматирование данных
const formatCoordinate = (value) => {
  if (!value || value === 0) return 'N/A'
  return value.toFixed(6)
}

const formatAltitude = (value) => {
  if (!value || value === 0) return 'N/A'
  return `${value.toFixed(1)} м`
}

const formatAngle = (value) => {
  if (!value || value === 0) return 'N/A'
  return `${value.toFixed(1)}°`
}

const formatSpeed = (value) => {
  if (!value || value === 0) return 'N/A'
  return `${value.toFixed(1)} м/с`
}

const formatVoltage = (value) => {
  if (!value || value === 0) return 'N/A'
  return `${value.toFixed(1)} В`
}

const formatCurrent = (value) => {
  if (!value || value === 0) return 'N/A'
  return `${value.toFixed(1)} А`
}

const formatRemaining = (value) => {
  if (!value || value === 0) return 'N/A'
  return `${value}%`
}

const formatHDOP = (value) => {
  if (!value || value === 0) return 'N/A'
  return value.toFixed(1)
}

const formatLastPacketTime = (value) => {
  if (!value) return 'N/A'
  const seconds = Math.round(value / 1000)
  return `${seconds}с назад`
}

// GPS Fix
const getGPSFixText = (fix) => {
  const fixTypes = {
    0: '❌ Нет GPS',
    1: '⚠️ Нет фикса',
    2: '🟡 2D фикс',
    3: '✅ 3D фикс'
  }
  return fixTypes[fix] || '❓ Неизвестно'
}

const getGPSFixClass = (fix) => {
  if (fix === 3) return 'status-good'
  if (fix === 2) return 'status-warning'
  return 'status-bad'
}

// Батарея
const getBatteryVoltageClass = (voltage) => {
  if (!voltage) return ''
  if (voltage < 10) return 'status-critical'
  if (voltage < 11) return 'status-warning'
  return 'status-good'
}

const getBatteryRemainingClass = (remaining) => {
  if (!remaining) return ''
  if (remaining < 20) return 'status-critical'
  if (remaining < 50) return 'status-warning'
  return 'status-good'
}
</script>

<style lang="scss" scoped>
.telemetry-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.telemetry-status-bar {
  display: flex;
  justify-content: flex-end;
  padding: 0 0 1rem 0;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.telemetry-status {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &.status-connected {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
  }
  
  &.status-disconnected {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: #ffffff;
  }
}

.telemetry-sections {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.telemetry-section {
  margin-bottom: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.telemetry-section__title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #334155;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.75rem;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 40px;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    border-radius: 1px;
  }
}

.telemetry-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.telemetry-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
}

.telemetry-item__label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.025em;
}

.telemetry-item__value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
  
  &.status-connected {
    color: #059669;
    background: #d1fae5;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  
  &.status-disconnected {
    color: #dc2626;
    background: #fee2e2;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  
  &.status-armed {
    color: #059669;
    background: #d1fae5;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  
  &.status-disarmed {
    color: #dc2626;
    background: #fee2e2;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  
  &.status-good {
    color: #059669;
    font-weight: 700;
  }
  
  &.status-warning {
    color: #d97706;
    font-weight: 700;
  }
  
  &.status-critical {
    color: #dc2626;
    font-weight: 700;
  }
  
  &.status-bad {
    color: #dc2626;
    font-weight: 700;
  }
  
  &.status-active {
    color: #059669;
    background: #d1fae5;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  
  &.status-inactive {
    color: #dc2626;
    background: #fee2e2;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
}

// Адаптивность для больших экранов
@media (min-width: 768px) {
  .telemetry-grid {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .telemetry-section {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .telemetry-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

// Скроллбар
.telemetry-sections::-webkit-scrollbar {
  width: 6px;
}

.telemetry-sections::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.telemetry-sections::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
  
  &:hover {
    background: #94a3b8;
  }
}
</style>
