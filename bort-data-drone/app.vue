<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
import { useMainStore } from '~/stores/mainStore'

const store = useMainStore()

onMounted(() => {
  console.log('🚀 Инициализация Pinia Store и WebSocket...')
  store.initWebSocket()
})

onUnmounted(() => {
  console.log('🔌 Закрытие WebSocket...')
  store.closeWebSocket()
})
</script>