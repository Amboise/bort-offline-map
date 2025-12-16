import { computed } from 'vue'
import { useMainStore } from '~/stores/mainStore'

/**
 * Composable обертка над Pinia Store для обратной совместимости
 * 
 * ВАЖНО: WebSocket инициализируется автоматически в app.vue
 * Этот composable используется только для доступа к методам store
 */
export const useWebSocket = () => {
  const store = useMainStore()
  
  return {
    // Доступ к WebSocket через computed для реактивности
    websocket: computed(() => store.websocket),
    isConnected: computed(() => store.isConnected),
    
    // Методы управления WebSocket (проксируем в store)
    connectWebSocket: () => store.initWebSocket(),
    sendCommand: (cmd) => store.sendCommand(cmd),
    addMessageHandler: (handler) => store.addMessageHandler(handler),
    removeMessageHandler: (handler) => store.removeMessageHandler(handler)
  }
}
