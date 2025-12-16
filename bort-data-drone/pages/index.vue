<template>
  <div class="page-layout">
    <div class="page-layout__sidebar">
      <VideoMapSection class="page-layout__video-map" />
      <PreflightChecks 
        class="page-layout__preflight" 
        @openFlightPlan="showFlightPlanModal = true"
        @openInsLaunch="showInsLaunchModal = true"
        @openSettings="handleOpenSettings"
        @preflightComplete="handlePreflightComplete"
      />
    </div>
    <MainContent 
      class="page-layout__main" 
      :showFlightPlanModal="showFlightPlanModal"
      :showInsLaunchModal="showInsLaunchModal"
      @updateFlightPlanModal="showFlightPlanModal = $event"
      @updateInsLaunchModal="showInsLaunchModal = $event"
      @arm="sendArmCommand"
      @disarm="sendDisarmCommand"
      @takeoff="sendTakeoffCommand"
      @land="sendLandCommand"
      @rtl="sendRTLCommand"
    />
  </div>
</template>

<script setup>
const store = useMainStore()

// Получаем состояние модальных окон из store
const showFlightPlanModal = computed({
  get: () => store.modals.showFlightPlan,
  set: (value) => value ? store.openModal('showFlightPlan') : store.closeModal('showFlightPlan')
})

const showInsLaunchModal = computed({
  get: () => store.modals.showInsLaunch,
  set: (value) => value ? store.openModal('showInsLaunch') : store.closeModal('showInsLaunch')
})

const sendArmCommand = () => {
  store.sendCommand('ARM')
}

const sendDisarmCommand = () => {
  store.sendCommand('DISARM')
}

const sendTakeoffCommand = () => {
  store.sendCommand('TAKEOFF')
}

const sendLandCommand = () => {
  store.sendCommand('LAND')
}

const sendRTLCommand = () => {
  store.sendCommand('RTL')
}

// Обработчик завершения предполетных проверок
const handlePreflightComplete = (data) => {
  // Здесь можно добавить дополнительную логику, например:
  // - Сохранить настройки батареи
  // - Отправить данные на сервер
  // - Автоматически открыть полетный план
  // store.openModal('showFlightPlan')
}

// Обработчик открытия настроек автопилота
const handleOpenSettings = () => {
  navigateTo('/autopilot')
}
</script>

<style scoped>
@import '~/assets/scss/main.scss';

.page-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-layout__sidebar {
  width: 420px;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
  border-right: 1px solid #e9ecef;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 2px;
    height: 100%;
    background: #1e3a8a;
    opacity: 0.5;
  }
}

.page-layout__video-map {
  flex: 2;
  border-bottom: 1px solid #e9ecef;
}

.page-layout__preflight {
  flex: 1;
}

.page-layout__buttons {
  flex: 0 0 auto;
  margin-top: auto;
}

.page-layout__main {
  flex: 1;
  background-color: #ffffff;
}

/* Стили для модального окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Планшеты и мобильные устройства (до 1024px) - мобильная версия */
@media (max-width: 1024px) {
  .page-layout {
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  
  .page-layout__sidebar {
    display: none; /* Скрываем боковую панель на планшетах и мобильных */
  }
  
  .page-layout__main {
    height: 100vh; /* Карта на весь экран */
    width: 100vw;
  }
  
  .modal-content {
    width: 95%;
    max-width: none;
    border-radius: 12px;
  }
  
  .modal-header {
    padding: 16px 20px;
  }
  
  .modal-title {
    font-size: 18px;
  }
  
  .modal-body {
    padding: 20px;
  }
}
</style>