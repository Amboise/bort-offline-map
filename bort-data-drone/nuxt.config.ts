// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  // Поддержка WebSocket и полифиллы для браузера
  vite: {
    // Better support for Tauri CLI output
    clearScreen: false,
    // Enable environment variables
    // Additional environment variables can be found at
    // https://v2.tauri.app/reference/environment-variables/
    envPrefix: ['VITE_', 'TAURI_'],
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      include: ['buffer', 'leaflet']
    },
    build: {
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            'leaflet': ['leaflet']
          }
        }
      }
    },
    ssr: {
      noExternal: ['leaflet']
    },
    server: {
      // Tauri requires a consistent port
      strictPort: true
    },
  },

  // Enables the development server to be discoverable by other devices when running on iOS physical devices
  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  // Nitro конфигурация для серверной части
  nitro: {
    experimental: {
      websocket: true
    },
    // Дополнительные настройки для WebSocket прокси
    devProxy: {
      '/api/antenna-proxy': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    },
    // Output configuration for Tauri
    output: {
      dir: '.output'
    }
  },

  // Мета-информация приложения
  app: {
    head: {
      title: 'Система управления дронами',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Подключение к антенне дрона через MAVLink протокол' }
      ]
    }
  },

  // CSS фреймворки (если нужны)
  css: [
    '~/assets/scss/normalize.scss',
    '~/assets/scss/fonts.scss',
    '~/assets/scss/main.scss',
    'leaflet/dist/leaflet.css'
  ],

  // Модули Nuxt
  modules: ['@nuxtjs/leaflet', '@pinia/nuxt'],
  
  // Настройки модуля Leaflet для производительности
  leaflet: {
    // Настройки по умолчанию
    markerCluster: false
  },

  // Enable SSG (required for Tauri and Capacitor)
  ssr: false,
  
  // (optional) Disable telemetry
  telemetry: {
    enabled: false
  },

  // Avoids error [unhandledRejection] EMFILE: too many open files, watch
  ignore: ['**/src-tauri/**'],

  // Настройки безопасности
  runtimeConfig: {
    // Серверные переменные
    antennaDefaultIP: '127.0.0.1',
    antennaDefaultPort: 5760,
    maxWebSocketConnections: 10,
    
    // Публичные переменные
    public: {
      appName: 'Drone Control System',
      version: '1.0.0',
      maxReconnectAttempts: 5,
      reconnectDelay: 3000
    }
  }
})
