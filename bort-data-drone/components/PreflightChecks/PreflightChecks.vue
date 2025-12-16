<template>
  <div class="preflight-checks">
    <!-- Три кнопки управления -->
    <button 
      class="preflight-btn"
      @click="openPreflightWizard"
      :disabled="store.isDroneArmed"
      :title="store.isDroneArmed ? 'Предполетные проверки недоступны: дрон активирован' : 'Предполетные проверки'"
    >
      Предполетные проверки
    </button>

    <button 
      class="preflight-btn"
      @click="openFlightPlan"
      title="Полетный план"
    >
      Полетный план
    </button>

    <button 
      class="preflight-btn preflight-btn--ins"
      @click="openInsLaunch"
      title="Запуск в режиме ИНС"
    >
      Запуск в режиме ИНС
    </button>

    <button 
      class="preflight-btn"
      @click="openSettings"
      title="Настройки автопилота"
    >
      Настройки автопилота
    </button>

    <!-- Wizard предполетных проверок -->
    <PreflightWizard
      :visible="showWizard"
      @close="handleWizardClose"
      @complete="handleWizardComplete"
    />
  </div>
</template>

<script setup>
import PreflightWizard from './PreflightWizard.vue'

const store = useMainStore()

// Emits
const emit = defineEmits(['openFlightPlan', 'openInsLaunch', 'openSettings', 'preflightComplete'])

// Локальное состояние только для wizard
const showWizard = ref(false)

// Данные дрона из store (прямой доступ)
// store.isDroneArmed, store.isDroneConnected

// Methods
const openPreflightWizard = () => {
  if (store.isDroneArmed) {
    alert('⚠️ Предполетные проверки недоступны: дрон уже активирован!')
    return
  }
  showWizard.value = true
}

const openFlightPlan = () => {
  emit('openFlightPlan')
}

const openInsLaunch = () => {
  emit('openInsLaunch')
}

const openSettings = () => {
  emit('openSettings')
}

const handleWizardClose = () => {
  showWizard.value = false
}

const handleWizardComplete = (data) => {
  showWizard.value = false
  emit('preflightComplete', data)
}
</script>

<style scoped>
.preflight-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #ffffff;
}

.preflight-btn {
  width: 100%;
  padding: 12px 16px;
  background: #2c5aa0;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  outline: none;

  &:hover:not(:disabled) {
    background: #3d6bb5;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
    background: #1e4785;
  }

  &:disabled {
    background: #95a5a6;
    color: #d1d8dd;
    cursor: not-allowed;
    opacity: 0.6;
    box-shadow: none;
  }
}

@media (max-width: 1024px) {
  .preflight-checks {
    padding: 10px;
    gap: 6px;
  }

  .preflight-btn {
    padding: 10px 14px;
    font-size: 14px;
  }
}
</style>
