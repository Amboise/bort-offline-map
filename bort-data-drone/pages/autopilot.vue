<template>
  <div class="autopilot-page">
    <AutopilotSettings />
  </div>
</template>

<script setup>
useHead({
  title: 'Настройки автопилота - Drone Control',
  meta: [
    { name: 'description', content: 'Настройка параметров автопилота дрона' }
  ]
})
</script>

<style scoped>
.autopilot-page {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
