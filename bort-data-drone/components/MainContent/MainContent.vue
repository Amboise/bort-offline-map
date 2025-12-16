<template>
  <div class="main-content">
    <div class="main-content__map">
      <ClientOnly>
        <l-map
          ref="mapRef"
          v-model:zoom="zoom"
          :center="center"
          :use-global-leaflet="false"
          v-bind="mapOptions"
          @click="handleMapClick"
          :class="{ 'map-selecting': mapSelectionMode !== null }"
          style="height: 100%; width: 100%"
        >
          <!-- Стандартная карта OpenStreetMap с оптимизацией -->
          <l-tile-layer
            v-if="!store.offlineLayer.enabled && store.currentMapLayer === 'standard'"
            url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
            layer-type="base"
            name="Стандартная"
            v-bind="getLayerTileOptions('standard')"
          ></l-tile-layer>
          
          <!-- Спутниковая карта с оптимизацией -->
          <l-tile-layer
            v-if="!store.offlineLayer.enabled && store.currentMapLayer === 'satellite'"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community"
            layer-type="base"
            name="Спутник"
            v-bind="getLayerTileOptions('satellite')"
          ></l-tile-layer>
          
          <!-- Топографическая карта с оптимизацией -->
          <l-tile-layer
            v-if="!store.offlineLayer.enabled && store.currentMapLayer === 'topo'"
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution="© OpenTopoMap (CC-BY-SA)"
            layer-type="base"
            name="Топографическая"
            v-bind="getLayerTileOptions('topo')"
          ></l-tile-layer>
          
          <!-- Тёмная тема с оптимизацией -->
          <l-tile-layer
            v-if="!store.offlineLayer.enabled && store.currentMapLayer === 'dark'"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap contributors © CARTO"
            layer-type="base"
            name="Тёмная"
            v-bind="getLayerTileOptions('dark')"
          ></l-tile-layer>
          
          <!-- Локальная оффлайн карта (читается с диска) -->
          <LocalOfflineTileLayer
            v-if="store.offlineLayer.enabled && activeOfflineMapMetadata?.isLocal"
            :leaflet-map="mapRef?.leafletObject"
            :map-name="store.activeOfflineMap"
            :metadata="{
              minZoom: activeOfflineMapMetadata?.minZoom,
              maxZoom: activeOfflineMapMetadata?.maxZoom
            }"
          />

          <!-- Серверная оффлайн карта (загруженная на сервер) -->
          <l-tile-layer
            v-if="store.offlineLayer.enabled && offlineTileUrl && !activeOfflineMapMetadata?.isLocal"
            :url="offlineTileUrl"
            attribution="Оффлайн карта"
            layer-type="base"
            name="Оффлайн"
            :min-zoom="activeOfflineMapMetadata?.minZoom ?? 0"
            :max-zoom="activeOfflineMapMetadata?.maxZoom ?? 19"
            :no-wrap="true"
            :keep-buffer="6"
          ></l-tile-layer>

          <!-- Трек полета дрона -->
          <l-polyline 
            v-if="store.droneData?.isConnected && optimizedFlightTrack.length > 1"
            :key="`polyline-${polylineKey}`"
            :lat-lngs="optimizedFlightTrack"
            :color="'#1e40af'"
            :weight="3"
            :opacity="0.8"
            :dash-array="'5, 5'"
            class="flight-track"
          ></l-polyline>

          <!-- Маркер дрона с кастомной иконкой -->
          <l-marker 
            v-if="store.droneData?.isConnected"
            :lat-lng="markerPosition" 
            :icon="droneIcon"
          ></l-marker>

          <!-- Точки миссии -->
          <template v-if="store.missionWaypoints.length > 0">
            <!-- Маршрут миссии -->
            <l-polyline 
              :lat-lngs="store.missionWaypoints.map(wp => [wp.lat, wp.lon])" 
              :color="'#3498db'"
              :weight="3"
              :opacity="0.8"
              :dash-array="'10,5'"
            ></l-polyline>
            
            <!-- Маркеры точек миссии -->
            <l-marker 
              v-for="(waypoint, index) in store.missionWaypoints" 
              :key="`waypoint-${index}`"
              :lat-lng="[waypoint.lat, waypoint.lon]"
              :icon="getWaypointIcon(index + 1)"
            >
              <l-popup>
                <div class="waypoint-popup">
                  <strong>📍 Точка {{ index + 1 }}</strong><br>
                  <span>📍 {{ waypoint.lat.toFixed(6) }}, {{ waypoint.lon.toFixed(6) }}</span><br>
                  <span>✈️ Высота: {{ waypoint.alt }}м</span><br>
                  <button @click="removeWaypoint(index)" class="remove-waypoint-btn">
                    🗑️ Удалить
                  </button>
                </div>
              </l-popup>
            </l-marker>
          </template>
          
          <!-- Десктопные контролы -->
          <l-control position="topright" class="desktop-only">
            <div class="desktop-controls">
              <button 
                @click="showTelemetryModal = true"
                class="desktop-controls__button"
                title="Телеметрия дрона"
              >
                <img src="/assets/img/telemetry.svg" alt="Телеметрия" class="desktop-controls__icon" />
                <span class="desktop-controls__text">Телеметрия</span>
              </button>
              <button 
                @click="centerOnDrone"
                class="desktop-controls__button"
                title="Центрировать карту на дроне"
                v-if="hasValidDroneGPS"
              >
                <span class="desktop-controls__icon">🎯</span>
                <span class="desktop-controls__text">К дрону</span>
              </button>
              <button 
                @click="clearFlightTrack"
                class="desktop-controls__button"
                title="Очистить трек полета"
                v-if="store.flightTrack.length > 0"
              >
                <span class="desktop-controls__icon">🗑️</span>
                <span class="desktop-controls__text">Очистить трек</span>
              </button>
              <button 
                @click="navigateToAutopilot"
                class="desktop-controls__button"
                title="Настройки автопилота"
              >
                <span class="desktop-controls__icon">⚙️</span>
                <span class="desktop-controls__text">Автопилот</span>
              </button>
              <button 
                @click="showOfflineMapModal = true"
                class="desktop-controls__button"
                title="Загрузить оффлайн карту"
              >
                <span class="desktop-controls__icon">⬇️</span>
                <span class="desktop-controls__text">Загрузить оффлайн-карту</span>
              </button>
            </div>
          </l-control>

          
          <!-- Кастомный элемент управления слоями -->
          <l-control position="topright">
            <div class="map-layer-control">
              <button 
                v-for="layer in layers" 
                :key="layer.key"
                @click="selectLayer(layer.key)"
                :class="{ 
                  'map-layer-control__button': true, 
                  'map-layer-control__button--active': store.currentMapLayer === layer.key && !store.offlineLayer.enabled 
                }"
                :title="layer.name"
              >
                {{ layer.icon }}
              </button>
              <button
                :class="[
                  'map-layer-control__button',
                  { 'map-layer-control__button--active': store.offlineLayer.enabled }
                ]"
                title="Оффлайн карта"
                @click="handleOfflineLayerToggle"
              >
                📦
              </button>
            </div>
          </l-control>
          
          <!-- Мобильные кнопки для открытия модальных окон -->
          <l-control position="topleft" class="mobile-only">
            <div class="mobile-controls">
              <button 
                @click="showVideoModal = true"
                class="mobile-controls__button"
                title="Открыть видео"
              >
                <img src="/assets/img/camera.png" alt="Видео" class="mobile-controls__icon" />
              </button>
              <button 
                @click="showTelemetryModal = true"
                class="mobile-controls__button"
                title="Телеметрия дрона"
              >
                <img src="/assets/img/telemetry.svg" alt="Телеметрия" class="mobile-controls__icon" />
              </button>
              <button 
                @click="centerOnDrone"
                class="mobile-controls__button"
                title="К дрону"
                v-if="hasValidDroneGPS"
              >
                <span class="mobile-controls__icon-text">🎯</span>
              </button>
              <button 
                @click="showControlsModal = true"
                class="mobile-controls__button"
                title="Панель управления"
              >
                <img src="/assets/img/gear.png" alt="Настройки" class="mobile-controls__icon" />
              </button>
              <button 
                @click="navigateToAutopilot"
                class="mobile-controls__button"
                title="Настройки автопилота"
              >
                <span class="mobile-controls__icon">⚙️</span>
              </button>
              <button 
                @click="togglePlanningMode"
                :class="['mobile-controls__button', { 'mobile-controls__button--active': store.missionPlanningMode }]"
                :title="store.missionPlanningMode ? 'Режим планирования: ВКЛ' : 'Режим планирования: ВЫКЛ'"
              >
                <span class="mobile-controls__icon-text">{{ store.missionPlanningMode ? '🎯' : '🗺️' }}</span>
                <span class="mobile-controls__label">П</span>
              </button>
              <button 
                @click="showOfflineMapModal = true"
                class="mobile-controls__button"
                title="Загрузить оффлайн карту"
              >
                <span class="mobile-controls__icon-text">⬇️</span>
              </button>
            </div>
          </l-control>
        </l-map>
        
        <template #fallback>
          <div class="map-loading">
            <div class="map-loading__spinner"></div>
            <p class="map-loading__text">Загрузка карты...</p>
          </div>
        </template>
      </ClientOnly>

      <!-- Виджеты в правом нижнем углу -->
      <div class="main-content__widgets">
        <!-- Виджет высоты -->
        <div class="main-content__altitude">
          <AltitudeWidget :drone-data="store.droneData" />
        </div>
        
        <!-- Мини-HUD -->
        <div class="main-content__hud">
          <FlightHud :drone-data="store.droneData" />
        </div>
      </div>
      
      <!-- Модальное окно полетного плана -->
      <div v-if="props.showFlightPlanModal" class="modal-overlay" @click="emit('updateFlightPlanModal', false)">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Управление полетом</h3>
            <button @click="emit('updateFlightPlanModal', false)" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <FlightPlanModal 
              :droneData="store.droneData"
              @arm="emit('arm')"
              @disarm="emit('disarm')"
              @takeoff="emit('takeoff')"
              @land="emit('land')"
              @rtl="emit('rtl')"
            />
          </div>
        </div>
      </div>
      
      <!-- Модальное окно запуска в режиме ИНС -->
      <div v-if="props.showInsLaunchModal" class="modal-overlay" @click="emit('updateInsLaunchModal', false)">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Запуск в режиме ИНС</h3>
            <button @click="emit('updateInsLaunchModal', false)" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <InsLaunchModal 
              :droneData="store.droneData" 
              @setMapSelectionMode="handleSetMapSelectionMode"
              @cancelMapSelection="handleCancelMapSelection"
            />
          </div>
        </div>
      </div>

      <!-- Модальное окно видео (только для мобильных) -->
      <div v-if="showVideoModal" class="modal-overlay mobile-only" @click="showVideoModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Видео</h3>
            <button @click="showVideoModal = false" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <VideoMapSection />
          </div>
        </div>
      </div>

      <!-- Модальное окно телеметрии -->
      <div v-if="showTelemetryModal" class="modal-overlay modal-overlay--light" @click="showTelemetryModal = false">
        <div class="modal-content modal-content--light" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">📊 Телеметрия дрона</h3>
            <button @click="showTelemetryModal = false" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <TelemetryModal :drone-data="store.droneData" :stats="store.telemetryStats" />
          </div>
        </div>
      </div>

      <!-- Модальное окно оффлайн карт -->
      <div v-if="showOfflineMapModal" class="modal-overlay modal-overlay--light" @click="showOfflineMapModal = false">
        <div class="modal-content modal-content--light modal-content--wide" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">📥 Оффлайн карты</h3>
            <button @click="showOfflineMapModal = false" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <OfflineMapModal />
          </div>
        </div>
      </div>

      <!-- Модальное окно панели управления (только для мобильных) -->
      <div v-if="showControlsModal" class="modal-overlay mobile-only" @click="showControlsModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Панель управления</h3>
            <button @click="showControlsModal = false" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <PreflightChecks @openFlightPlan="emit('updateFlightPlanModal', true)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { divIcon } from 'leaflet'
import LocalOfflineTileLayer from '~/components/LocalOfflineTileLayer.vue'

// Используем Pinia store
const store = useMainStore()

// Props и emits
const props = defineProps({
  showFlightPlanModal: {
    type: Boolean,
    default: false
  },
  showInsLaunchModal: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['updateFlightPlanModal', 'updateInsLaunchModal', 'arm', 'disarm', 'takeoff', 'land', 'rtl'])

// Используем композабл для оптимизации производительности
const { getTileOptions, getMapOptions, optimizeForMobile, monitorPerformance } = useMapPerformance()

// Данные доступны напрямую из store (прямой доступ)
// Computed только для двусторонней привязки (v-model)

// Карта - zoom и center для v-model
const zoom = computed({
  get: () => store.mapZoom,
  set: (value) => store.setMapZoom(value)
})
const center = computed({
  get: () => store.mapCenter,
  set: (value) => store.setMapCenter(value)
})

// Модальные окна
const showVideoModal = computed({
  get: () => store.modals.showVideo,
  set: (value) => value ? store.openModal('showVideo') : store.closeModal('showVideo')
})
const showTelemetryModal = computed({
  get: () => store.modals.showTelemetry,
  set: (value) => value ? store.openModal('showTelemetry') : store.closeModal('showTelemetry')
})
const showControlsModal = computed({
  get: () => store.modals.showControls,
  set: (value) => value ? store.openModal('showControls') : store.closeModal('showControls')
})
const showOfflineMapModal = computed({
  get: () => store.modals.showOfflineUpload,
  set: (value) => value ? store.openModal('showOfflineUpload') : store.closeModal('showOfflineUpload')
})

// Настройки производительности для карты
const mapOptions = ref({
  ...getMapOptions(),
  ...optimizeForMobile()
})

// Позиция маркера дрона (локальная, обновляется из телеметрии)
const markerPosition = ref([55.7558, 37.6173])

// Ключ для принудительного обновления полилинии
const polylineKey = ref(0)

// Режим выбора точки на карте (локальный, для UI)
const mapSelectionMode = ref(null)

// Дебаунсинг для поворота иконки дрона
const debouncedRotation = ref(0)
let rotationTimeout = null

// Вычисляем угол поворота иконки дрона с дебаунсингом
const droneRotation = computed(() => {
  const yaw = store.droneData?.attitude?.yaw ?? 0
  const newRotation = (yaw || 0) - 45
  
  // Дебаунсинг поворота - обновляем только при значительных изменениях
  if (Math.abs(newRotation - debouncedRotation.value) > 2) {
    clearTimeout(rotationTimeout)
    rotationTimeout = setTimeout(() => {
      debouncedRotation.value = newRotation
    }, 50) // Задержка 50мс для плавности
  }
  
  return debouncedRotation.value
})

// Оптимизированный трек для рендеринга (упрощаем при большом количестве точек)
const optimizedFlightTrack = computed(() => {
  // Пересчет optimizedFlightTrack
  
  if (!store.flightTrack || store.flightTrack.length === 0) {
    // Трек пуст
    return []
  }
  
  if (store.flightTrack.length <= 200) {
    // Используем полный трек
    return store.flightTrack
  }
  
  // Упрощаем трек, оставляя каждую N-ю точку
  const step = Math.ceil(store.flightTrack.length / 200)
  const optimized = store.flightTrack.filter((_, index) => index % step === 0)
  // Оптимизированный трек готов
  return optimized
})

// Принудительное обновление трека (удаление старых точек)
const forceUpdateTrack = () => {
  if (store.flightTrack.length > store.trackSettings.maxPoints) {
    const removeCount = store.trackSettings.removeBatchSize
    store.flightTrack = store.flightTrack.slice(removeCount)
    
    // Принудительно обновляем полилинию
    polylineKey.value++
    // Полилиния обновлена
  }
}


// Функция для обновления позиции дрона
// Оптимизация обновления позиции дрона с requestAnimationFrame
let pendingPositionUpdate = null
let animationFrameId = null

const updateDronePosition = (newPosition) => {
  // Сохраняем новую позицию для обновления
  pendingPositionUpdate = newPosition
  
  // Отменяем предыдущий запрос анимации если есть
  if (animationFrameId) {
    return // Уже запланировано обновление
  }
  
  // Планируем обновление на следующий кадр
  animationFrameId = requestAnimationFrame(() => {
    if (pendingPositionUpdate) {
      markerPosition.value = pendingPositionUpdate
      pendingPositionUpdate = null
    }
    animationFrameId = null
  })
}

// Вычисляемое свойство для проверки валидности GPS координат дрона
const hasValidDroneGPS = computed(() => {
  if (!store.droneData?.isConnected) return false
  if (!store.droneData?.gps?.lat || !store.droneData?.gps?.lon) return false
  
  const lat = store.droneData.gps.lat
  const lon = store.droneData.gps.lon
  
  // Проверяем что координаты не нулевые и не дефолтные (Москва)
  if (lat === 0 && lon === 0) return false
  if (Math.abs(lat - 55.7558) < 0.0001 && Math.abs(lon - 37.6173) < 0.0001) return false
  
  // Проверяем что координаты в допустимых пределах
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false
  
  return true
})

// Функция для центрирования карты на дроне
const centerOnDrone = () => {
  if (!hasValidDroneGPS.value) {
    console.warn('⚠️ Нет валидных GPS координат дрона для центрирования')
    return
  }
  
  const dronePosition = [store.droneData.gps.lat, store.droneData.gps.lon]
  
  // Используем прямой API Leaflet для надежного центрирования
  if (mapRef.value && mapRef.value.leafletObject) {
    const map = mapRef.value.leafletObject
    
    // Определяем целевой зум
    const targetZoom = store.mapZoom < 15 ? 16 : store.mapZoom
    
    // Используем setView для плавного перемещения с анимацией
    map.setView(dronePosition, targetZoom, {
      animate: true,
      duration: 0.5 // Длительность анимации в секундах
    })
    
  } else {
    // Фоллбэк на store если API недоступен
    store.setMapCenter(dronePosition)
    if (store.mapZoom < 15) {
      store.setMapZoom(16)
    }
  }
}


// Кастомная иконка дрона с поворотом
const droneIcon = computed(() => {
  return divIcon({
    html: `<div class="drone-marker" style="transform: rotate(${droneRotation.value}deg);">
             <img src="/drone.png" alt="Drone" style="width: 32px; height: 32px;" />
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: 'drone-marker-container'
  })
})

// Функция для создания иконки waypoint
const getWaypointIcon = (number) => {
  return divIcon({
    html: `<div class="waypoint-marker">
             <div class="waypoint-number">${number}</div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: 'waypoint-marker-container'
  })
}

// Обработчик клика по карте
const handleMapClick = (event) => {
  const { lat, lng } = event.latlng
  
  // Проверяем, активен ли режим выбора точки для корректировки
  if (mapSelectionMode.value && mapSelectionMode.value.callback) {
    // Сохраняем callback и сразу очищаем режим выбора
    const callback = mapSelectionMode.value.callback
    mapSelectionMode.value = null
    
    // Вызываем callback с координатами
    callback({ lat, lng })
    return
  }
  
  // Если не активен режим корректировки, обрабатываем планирование миссии
  if (!store.missionPlanningMode) return
  
  // Добавляем новую точку миссии через store
  const newWaypoint = {
    lat: parseFloat(lat.toFixed(6)),
    lon: parseFloat(lng.toFixed(6)),
    alt: 50 // Высота по умолчанию
  }
  
  store.addWaypoint(newWaypoint)
  
}

// Обработчик активации режима выбора точки на карте
const handleSetMapSelectionMode = (options) => {
  mapSelectionMode.value = options
}

// Обработчик отмены режима выбора точки на карте
const handleCancelMapSelection = () => {
  mapSelectionMode.value = null
}

// Функции для работы с миссией (используем store)
const removeWaypoint = (index) => {
  store.removeWaypoint(index)
}

const clearMission = () => {
  store.clearMission()
}

const enableMissionPlanning = () => {
  store.enableMissionPlanning()
}

const disableMissionPlanning = () => {
  store.disableMissionPlanning()
}

const togglePlanningMode = () => {
  store.toggleMissionPlanning()
}

// Функции для работы с миссией (будут использоваться из FlightPlanModal)
const missionMethods = {
  waypoints: computed(() => store.missionWaypoints),
  status: computed(() => store.missionStatus),
  planningMode: computed(() => store.missionPlanningMode),
  addWaypoint: (waypoint) => {
    store.missionWaypoints.push(waypoint)
  },
  removeWaypoint,
  clearMission,
  enablePlanning: enableMissionPlanning,
  disablePlanning: disableMissionPlanning,
  setWaypoints: (waypoints) => {
    store.missionWaypoints = waypoints
  },
  setStatus: (status) => {
    Object.assign(store.missionStatus, status)
  }
}

// Доступные слои карты с настройками производительности
const layers = computed(() => [
  {
    key: 'standard',
    name: 'Стандартная карта',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19
  },
  {
    key: 'satellite',
    name: 'Спутниковая карта',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19
  },
  {
    key: 'topo',
    name: 'Топографическая карта',
    icon: '🏔️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 17
  },
  {
    key: 'dark',
    name: 'Тёмная тема',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19
  }
])

const activeOfflineMapMetadata = computed(() => {
  if (!store.activeOfflineMap) return null
  return store.offlineMaps.find(map => map.name === store.activeOfflineMap) || null
})

const offlineTileUrl = computed(() => {
  if (!store.activeOfflineMap) return null
  // Для локальных карт не используем серверный URL
  const mapMetadata = store.offlineMaps.find(map => map.name === store.activeOfflineMap)
  if (mapMetadata?.isLocal) {
    return null // Локальные карты обрабатываются через LocalOfflineTileLayer
  }
  return `/api/offline-map/${encodeURIComponent(store.activeOfflineMap)}/{z}/{x}/{y}`
})

// Настройки тайлов для каждого типа карты
const getLayerTileOptions = (layerType) => {
  return {
    ...getTileOptions(layerType),
    ...optimizeForMobile()
  }
}

const fetchOfflineMapsList = async () => {
  try {
    const { maps } = await $fetch('/api/offline-map/list')
    store.setOfflineMaps(maps || [])
  } catch (error) {
    console.warn('❌ Не удалось получить список оффлайн карт', error)
  }
}

const handleOfflineLayerToggle = () => {
  if (!store.activeOfflineMap) {
    showOfflineMapModal.value = true
    return
  }
  store.toggleOfflineLayer()
}

const selectLayer = (layerKey) => {
  if (store.offlineLayer.enabled) {
    store.disableOfflineLayer()
  }
  store.setMapLayer(layerKey)
}

// Ссылка на карту для мониторинга производительности
const mapRef = ref(null)

// Функция для вычисления расстояния между двумя точками (в метрах)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // Радиус Земли в метрах
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Функция для добавления точки в трек с оптимизацией
const addTrackPoint = (newPosition) => {
  const now = Date.now()
  const [lat, lon] = newPosition
  
  
  // Проверяем интервал времени
  if (now - store.trackSettings.lastRecordTime < store.trackSettings.recordInterval) {
    return
  }
  
  // Проверяем скорость дрона
  const speed = store.droneData?.velocity?.groundSpeed || 0
  if (speed < store.trackSettings.minSpeed) {
    return
  }
  
  // Проверяем расстояние от последней точки
  if (store.flightTrack.length > 0) {
    const lastPoint = store.flightTrack[store.flightTrack.length - 1]
    const distance = calculateDistance(lastPoint[0], lastPoint[1], lat, lon)
    
    if (distance < store.trackSettings.minDistance) {
      return
    }
  }
  
  // Добавляем точку
  store.flightTrack.push(newPosition)
  store.trackSettings.lastRecordTime = now
  
  // Обновляем полилинию только каждые N точек для уменьшения моргания
  if (store.flightTrack.length % store.trackSettings.polylineUpdateInterval === 0) {
    polylineKey.value++
  }
  
  
  // Циклический режим - удаляем старые точки при превышении лимита
  if (store.trackSettings.circularMode && store.flightTrack.length > store.trackSettings.maxPoints) {
    // Удаляем фиксированное количество старых точек
    const removeCount = store.trackSettings.removeBatchSize
    store.flightTrack = store.flightTrack.slice(removeCount)
  }
  
  // Альтернативный режим - ограничиваем по общей длине трека
  if (!store.trackSettings.circularMode) {
    let totalLength = 0
    for (let i = 1; i < store.flightTrack.length; i++) {
      const prev = store.flightTrack[i - 1]
      const curr = store.flightTrack[i]
      totalLength += calculateDistance(prev[0], prev[1], curr[0], curr[1])
      
      // Если превысили максимальную длину, удаляем старые точки
      if (totalLength > store.trackSettings.trackLength) {
        store.flightTrack = store.flightTrack.slice(i)
        break
      }
    }
  }
}

// Функция для очистки трека полета (используем store)
const clearFlightTrack = () => {
  store.clearFlightTrack()
  // Принудительно обновляем полилинию
  polylineKey.value++
}

// Функция для навигации к настройкам автопилота
const navigateToAutopilot = () => {
  navigateTo('/autopilot')
}

// Обработка сообщений WebSocket
// Оптимизация обновления droneData с requestAnimationFrame
let pendingDroneData = null
let droneDataAnimationFrameId = null

const updateDroneData = (data) => {
  pendingDroneData = data
  
  if (droneDataAnimationFrameId) {
    return // Уже запланировано обновление
  }
  
  droneDataAnimationFrameId = requestAnimationFrame(() => {
    if (pendingDroneData) {
      store.droneData = pendingDroneData
      pendingDroneData = null
    }
    droneDataAnimationFrameId = null
  })
}

const handleWebSocketMessage = (event) => {
  try {
    const message = JSON.parse(event.data)
    if (message.type === 'telemetry' && message.data) {
      // Данные дрона обновляются автоматически в store
      // Здесь только обновляем позицию маркера и трек для UI
      
      if (message.data.gps && message.data.gps.lat !== 0 && message.data.gps.lon !== 0) {
        const newPosition = [message.data.gps.lat, message.data.gps.lon]
        
        // Синхронно обновляем позицию маркера для карты
        updateDronePosition(newPosition)
        
        // Добавляем точку в трек через store
        if (store.flightTrack.length === 0) {
          // Первая точка
          store.addTrackPoint(newPosition)
          polylineKey.value++
        } else {
          // Последующие точки с проверками
          addTrackPoint(newPosition)
        }
        
        // Центрируем карту на дроне при первом получении координат
        if (store.mapCenter[0] === 55.7558 && store.mapCenter[1] === 37.6173) {
          store.setMapCenter([message.data.gps.lat, message.data.gps.lon])
        }
      }
    }
    // stats и arm_status обрабатываются автоматически в store
  } catch (error) {
    console.error('❌ Ошибка парсинга WebSocket сообщения:', error)
  }
}

// Предоставляем данные дочерним компонентам через provide (для совместимости)
provide('droneData', computed(() => store.droneData))
provide('websocket', computed(() => store.websocket))
provide('missionMethods', missionMethods)

// Обработчик клавиатуры для переключения режима планирования
const handleKeyPress = (event) => {
  // Проверяем, что фокус не в поле ввода
  const tagName = event.target.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea') {
    return
  }
  
  // Переключаем режим планирования по клавишам 'g' или 'п'
  if (event.key === 'g' || event.key === 'п' || event.key === 'G' || event.key === 'П') {
    event.preventDefault()
    togglePlanningMode()
  }
}

onMounted(() => {
  if (mapRef.value) {
    monitorPerformance(mapRef.value)
  }
  
  // WebSocket уже инициализирован в app.vue через store
  // Регистрируем только локальный обработчик сообщений для UI
  store.addMessageHandler(handleWebSocketMessage)
  
  // Периодическое принудительное обновление трека каждые 30 секунд
  setInterval(forceUpdateTrack, 30000)
  
  // Добавляем обработчик клавиатуры
  window.addEventListener('keydown', handleKeyPress)
  
  fetchOfflineMapsList()
})

// Размонтирование компонента
onUnmounted(() => {
  // Удаляем только локальный обработчик сообщений
  store.removeMessageHandler(handleWebSocketMessage)
  
  // WebSocket остается активным (управляется в app.vue)
  
  // Удаляем обработчик клавиатуры
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
@import './MainContent.scss';
</style>
