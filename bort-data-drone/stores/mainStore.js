import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    // ========================================
    // WebSocket состояние
    // ========================================
    websocket: null,
    isWebSocketConnected: false,
    messageHandlers: [],
    
    // ========================================
    // Данные дрона (телеметрия)
    // ========================================
    droneData: {
      isConnected: false,
      lastUpdate: 0,
      gps: {
        lat: 0,
        lon: 0,
        alt: 0,
        satellitesVisible: 0,
        fix: 0,
        hdop: 0
      },
      attitude: {
        roll: 0,
        pitch: 0,
        yaw: 0
      },
      velocity: {
        groundSpeed: 0,
        airSpeed: 0,
        verticalSpeed: 0
      },
      battery: {
        voltage: 0,
        current: 0,
        remaining: 0
      },
      system: {
        mode: 'UNKNOWN',
        armed: false,
        systemId: 0,
        componentId: 0,
        mavlinkVersion: 0,
        status: 'UNKNOWN'
      },
      rc: {
        rssi: 0,
        channels: []
      }
    },
    
    // Статистика телеметрии
    telemetryStats: {
      receivedPackets: 0,
      timeSinceLastPacket: 0,
      isActive: false,
      droneConnected: false
    },
    
    // ========================================
    // Состояние миссии
    // ========================================
    missionWaypoints: [],
    missionStatus: {
      isUploaded: false,
      isActive: false,
      uploadInProgress: false,
      currentWaypoint: 0,
      totalWaypoints: 0
    },
    missionPlanningMode: false,
    
    // ========================================
    // Настройки карты
    // ========================================
    mapCenter: [55.7558, 37.6173],
    mapZoom: 10,
    currentMapLayer: 'standard',
    lastOnlineMapLayer: 'standard',
    flightTrack: [],
    offlineMaps: [],
    activeOfflineMap: null,
    offlineLayer: {
      enabled: false,
      lastUpdated: null
    },
    
    // Настройки трека полета
    trackSettings: {
      maxPoints: 8000,
      minDistance: 0.05,
      lastRecordTime: 0,
      recordInterval: 100,
      circularMode: true,
      trackLength: 10000,
      minSpeed: 0,
      removeBatchSize: 200,
      polylineUpdateInterval: 1
    },
    
    // ========================================
    // Состояние модальных окон
    // ========================================
    modals: {
      showFlightPlan: false,
      showInsLaunch: false,
      showVideo: false,
      showTelemetry: false,
      showControls: false,
      showOfflineUpload: false
    },
    
    // ========================================
    // Настройки автопилота
    // ========================================
    autopilot: {
      isConnected: false,
      host: '',
      port: '',
      parameters: [],
      isLoadingParameters: false,
      parameterSyncStatus: '',
      lastParameterUpdate: null,
      selectedCategory: 'All'
    },
    
    // ========================================
    // Прочее
    // ========================================
    uploadedImage: null,
  }),

  getters: {
    // ========================================
    // WebSocket геттеры
    // ========================================
    isConnected: (state) => state.isWebSocketConnected,
    
    // ========================================
    // Геттеры данных дрона
    // ========================================
    isDroneConnected: (state) => state.droneData.isConnected,
    isDroneArmed: (state) => state.droneData.system?.armed || false,
    droneGPS: (state) => state.droneData.gps,
    droneBattery: (state) => state.droneData.battery,
    droneAttitude: (state) => state.droneData.attitude,
    droneVelocity: (state) => state.droneData.velocity,
    
    // Проверка валидности GPS
    hasValidGPS: (state) => {
      const gps = state.droneData.gps
      if (!gps || !gps.lat || !gps.lon) return false
      if (gps.lat === 0 && gps.lon === 0) return false
      if (Math.abs(gps.lat - 55.7558) < 0.0001 && Math.abs(gps.lon - 37.6173) < 0.0001) return false
      if (gps.lat < -90 || gps.lat > 90 || gps.lon < -180 || gps.lon > 180) return false
      return true
    },
    
    // ========================================
    // Геттеры миссии
    // ========================================
    missionWaypointsCount: (state) => state.missionWaypoints.length,
    isMissionUploaded: (state) => state.missionStatus.isUploaded,
    isMissionActive: (state) => state.missionStatus.isActive,
    isMissionPlanningActive: (state) => state.missionPlanningMode,
    
    // ========================================
    // Геттеры карты
    // ========================================
    flightTrackLength: (state) => state.flightTrack.length,
    
    // ========================================
    // Геттеры автопилота
    // ========================================
    autopilotConnected: (state) => state.autopilot.isConnected,
    autopilotParametersCount: (state) => state.autopilot.parameters.length,
    modifiedParametersCount: (state) => state.autopilot.parameters.filter(p => p.modified).length,
  },

  actions: {
    // ========================================
    // WebSocket actions
    // ========================================
    initWebSocket() {
      if (this.websocket) return

      try {
        this.websocket = new WebSocket('ws://localhost:8080')
        
        this.websocket.onopen = () => {
          this.isWebSocketConnected = true
          console.log('✅ WebSocket подключен')
          this.websocket.send('START_UDP')
        }
        
        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            // Автоматически обновляем данные дрона
            if (message.type === 'telemetry' && message.data) {
              this.updateDroneData(message.data)
            } else if (message.type === 'stats') {
              this.updateTelemetryStats(message)
            } else if (message.type === 'arm_status') {
              this.updateArmStatus(message)
            }
            
            // Вызываем все зарегистрированные обработчики
            this.messageHandlers.forEach(handler => {
              try {
                handler(event)
              } catch (error) {
                console.error('❌ Ошибка в обработчике сообщений:', error)
              }
            })
          } catch (error) {
            console.error('❌ Ошибка парсинга WebSocket сообщения:', error)
          }
        }
        
        this.websocket.onclose = () => {
          this.isWebSocketConnected = false
          console.log('❌ WebSocket отключен')
          this.websocket = null
          // Переподключение через 3 секунды
          setTimeout(() => this.initWebSocket(), 3000)
        }
        
        this.websocket.onerror = (error) => {
          console.error('❌ WebSocket ошибка:', error)
          this.isWebSocketConnected = false
        }
      } catch (error) {
        console.error('❌ Ошибка создания WebSocket:', error)
        setTimeout(() => this.initWebSocket(), 5000)
      }
    },
    
    closeWebSocket() {
      if (this.websocket) {
        this.websocket.close()
        this.websocket = null
        this.isWebSocketConnected = false
      }
    },
    
    sendCommand(command) {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(command)
        return true
      }
      console.error('❌ WebSocket не подключен')
      return false
    },
    
    addMessageHandler(handler) {
      this.messageHandlers.push(handler)
    },
    
    removeMessageHandler(handler) {
      const index = this.messageHandlers.indexOf(handler)
      if (index > -1) {
        this.messageHandlers.splice(index, 1)
      }
    },
    
    // ========================================
    // Drone data actions
    // ========================================
    updateDroneData(data) {
      this.droneData = { ...this.droneData, ...data }
    },
    
    updateTelemetryStats(stats) {
      this.telemetryStats = { ...this.telemetryStats, ...stats }
    },
    
    updateArmStatus(status) {
      if (this.droneData.system) {
        this.droneData.system.armed = status.armed
        this.droneData.system.status = status.status
      }
    },
    
    // ========================================
    // Mission actions
    // ========================================
    addWaypoint(waypoint) {
      this.missionWaypoints.push(waypoint)
    },
    
    removeWaypoint(index) {
      this.missionWaypoints.splice(index, 1)
    },
    
    clearMission() {
      this.missionWaypoints = []
      this.missionStatus = {
        isUploaded: false,
        isActive: false,
        uploadInProgress: false,
        currentWaypoint: 0,
        totalWaypoints: 0
      }
    },
    
    setWaypoints(waypoints) {
      this.missionWaypoints = waypoints
    },
    
    updateMissionStatus(status) {
      this.missionStatus = { ...this.missionStatus, ...status }
    },
    
    enableMissionPlanning() {
      this.missionPlanningMode = true
    },
    
    disableMissionPlanning() {
      this.missionPlanningMode = false
    },
    
    toggleMissionPlanning() {
      this.missionPlanningMode = !this.missionPlanningMode
    },
    
    // ========================================
    // Map actions
    // ========================================
    setMapCenter(center) {
      this.mapCenter = center
    },
    
    setMapZoom(zoom) {
      this.mapZoom = zoom
    },
    
    setMapLayer(layer) {
      this.currentMapLayer = layer
      if (!this.offlineLayer.enabled) {
        this.lastOnlineMapLayer = layer
      }
    },
    
    addTrackPoint(point) {
      this.flightTrack.push(point)
      
      // Удаляем старые точки при превышении лимита
      if (this.trackSettings.circularMode && this.flightTrack.length > this.trackSettings.maxPoints) {
        const removeCount = this.trackSettings.removeBatchSize
        this.flightTrack = this.flightTrack.slice(removeCount)
      }
    },
    
    clearFlightTrack() {
      this.flightTrack = []
      this.trackSettings.lastRecordTime = 0
    },
    
    updateTrackSettings(settings) {
      this.trackSettings = { ...this.trackSettings, ...settings }
    },
    
    // ========================================
    // Modal actions
    // ========================================
    openModal(modalName) {
      this.modals[modalName] = true
    },
    
    closeModal(modalName) {
      this.modals[modalName] = false
    },
    
    toggleModal(modalName) {
      this.modals[modalName] = !this.modals[modalName]
    },
    
    // ========================================
    // Offline map actions
    // ========================================
    setOfflineMaps(maps = []) {
      this.offlineMaps = maps
      const currentNames = maps.map(map => map.name)
      if (this.activeOfflineMap && !currentNames.includes(this.activeOfflineMap)) {
        this.activeOfflineMap = null
        this.offlineLayer.enabled = false
      }
    },
    
    setActiveOfflineMap(mapName) {
      this.activeOfflineMap = mapName
      if (!mapName) {
        this.offlineLayer.enabled = false
      }
    },
    
    enableOfflineLayer() {
      if (!this.activeOfflineMap) {
        console.warn('⚠️ Нельзя включить оффлайн слой без выбранной карты')
        return
      }
      if (!this.offlineLayer.enabled) {
        this.lastOnlineMapLayer = this.currentMapLayer
      }
      this.offlineLayer.enabled = true
      this.offlineLayer.lastUpdated = Date.now()
    },
    
    disableOfflineLayer() {
      this.offlineLayer.enabled = false
      if (this.lastOnlineMapLayer) {
        this.currentMapLayer = this.lastOnlineMapLayer
      }
    },
    
    toggleOfflineLayer() {
      if (this.offlineLayer.enabled) {
        this.disableOfflineLayer()
      } else {
        this.enableOfflineLayer()
      }
    },
    
    // ========================================
    // Autopilot actions
    // ========================================
    setAutopilotConnection(connected, host = '', port = '') {
      this.autopilot.isConnected = connected
      this.autopilot.host = host
      this.autopilot.port = port
    },
    
    setAutopilotParameters(parameters) {
      this.autopilot.parameters = parameters
      this.autopilot.lastParameterUpdate = new Date()
    },
    
    updateAutopilotParameter(name, value) {
      const param = this.autopilot.parameters.find(p => p.name === name)
      if (param) {
        param.value = value
        param.modified = true
      }
    },
    
    setParameterLoadingState(isLoading, status = '') {
      this.autopilot.isLoadingParameters = isLoading
      this.autopilot.parameterSyncStatus = status
    },
    
    setSelectedCategory(category) {
      this.autopilot.selectedCategory = category
    },
    
    // ========================================
    // Other actions
    // ========================================
    setUploadedImage(file) {
      this.uploadedImage = file
    },
  },
})
