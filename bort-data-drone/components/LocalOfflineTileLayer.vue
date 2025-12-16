<template>
  <!-- Пустой компонент, слой добавляется программно -->
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import { readTileFromDirectory, getDirectoryHandle } from '~/composables/useFileSystemAccess.js'

const props = defineProps<{
  leafletMap: any // Передаем напрямую Leaflet map instance вместо ref
  mapName: string
  metadata: {
    minZoom?: number
    maxZoom?: number
  }
}>()

let localTileLayer: any = null
let directoryHandle: FileSystemDirectoryHandle | null = null

// Кастомный класс для tile layer
const LocalTileLayerClass = L.TileLayer.extend({
  initialize: function (directoryHandle: FileSystemDirectoryHandle, options: any) {
    this.directoryHandle = directoryHandle
    L.TileLayer.prototype.initialize.call(this, '', options)
  },

  createTile: function (coords: any, done: (error: Error | null, tile: HTMLImageElement) => void) {
    console.log('🖼️ createTile вызван для:', coords.z, coords.x, coords.y)
    const tile = document.createElement('img')
    
    // Устанавливаем белый фон для тайла по умолчанию
    tile.style.backgroundColor = '#ffffff'
    
    L.DomEvent.on(tile, 'load', () => {
      console.log('✅ Тайл загружен:', coords.z, coords.x, coords.y)
      done(null, tile)
    })
    
    L.DomEvent.on(tile, 'error', () => {
      console.error('❌ Ошибка загрузки тайла:', coords.z, coords.x, coords.y)
      tile.style.backgroundColor = '#ffffff'
      done(new Error('Не удалось загрузить тайл'), tile)
    })

    // Читаем тайл с локального диска
    this.loadTileFromLocal(coords.z, coords.x, coords.y)
      .then((tileData) => {
        if (tileData && tileData.data) {
          console.log('📦 Тайл прочитан с диска:', coords.z, coords.x, coords.y, 'size:', tileData.data.byteLength)
          const blob = new Blob([tileData.data], { type: tileData.mime })
          const url = URL.createObjectURL(blob)
          tile.src = url
          
          // Очищаем URL после загрузки
          tile.onload = () => {
            setTimeout(() => URL.revokeObjectURL(url), 100)
          }
        } else {
          // Тайл не найден - показываем белое изображение
          console.warn('⚠️ Тайл не найден:', coords.z, coords.x, coords.y)
          // Создаём белое изображение 256x256 пикселей
          tile.style.backgroundColor = '#ffffff'
          tile.style.width = '256px'
          tile.style.height = '256px'
          // Используем canvas для создания белого изображения
          const canvas = document.createElement('canvas')
          canvas.width = 256
          canvas.height = 256
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, 256, 256)
            tile.src = canvas.toDataURL('image/png')
          } else {
            // Fallback - белый SVG
            tile.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg=='
          }
          done(null, tile)
        }
      })
      .catch((error) => {
        console.error('❌ Ошибка загрузки тайла:', error, coords.z, coords.x, coords.y)
        tile.style.backgroundColor = '#ffffff'
        tile.style.width = '256px'
        tile.style.height = '256px'
        // Создаём белое изображение через canvas
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, 256, 256)
          tile.src = canvas.toDataURL('image/png')
        } else {
          // Fallback - белый SVG
          tile.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg=='
        }
        done(null, tile)
      })

    return tile
  },

  loadTileFromLocal: async function (z: number, x: number, y: number) {
    try {
      if (!this.directoryHandle) {
        console.warn('⚠️ directoryHandle не установлен для чтения тайла', z, x, y)
        return null
      }
      
      // Проверяем, что handle все еще валиден
      try {
        await this.directoryHandle.getDirectoryHandle(String(z))
      } catch (error) {
        console.error('❌ Handle директории невалиден или доступ потерян:', error)
        return null
      }
      
      const tileData = await readTileFromDirectory(this.directoryHandle, String(z), String(x), String(y))
      return tileData
    } catch (error) {
      console.error('❌ Ошибка чтения тайла с локального диска:', error, 'z:', z, 'x:', x, 'y:', y)
      return null
    }
  }
})

const getMapInstance = () => {
  // Теперь получаем карту напрямую из пропса
  const map = props.leafletMap
  if (!map) {
    return null
  }
  // Проверяем, что карта действительно инициализирована
  if (typeof map.getZoom !== 'function' || typeof map.addLayer !== 'function') {
    return null
  }
  return map
}

let initAttempts = 0
const MAX_INIT_ATTEMPTS = 100 // Увеличиваем до 10 секунд (100 * 100ms)

const initTileLayer = async () => {
  // Проверяем наличие обязательных пропсов
  if (!props.mapName) {
    console.warn('⚠️ mapName не установлен, пропускаем инициализацию')
    return
  }

  if (initAttempts >= MAX_INIT_ATTEMPTS) {
    console.error('❌ Превышено максимальное количество попыток инициализации tile layer', {
      attempts: initAttempts,
      mapRefExists: !!props.mapRef?.value,
      leafletObjectExists: !!props.mapRef?.value?.leafletObject
    })
    return
  }

  const map = getMapInstance()
  if (!map) {
    initAttempts++
    // Логируем только каждую 10-ю попытку, чтобы не засорять консоль
    if (initAttempts % 10 === 0 || initAttempts === 1) {
      console.log(`⏳ Попытка ${initAttempts}/${MAX_INIT_ATTEMPTS}: карта еще не готова, ждем...`)
    }
    // Ждем перед следующей попыткой
    await new Promise(resolve => setTimeout(resolve, 100))
    await initTileLayer()
    return
  }

  // Если карта готова, сбрасываем счетчик
  if (initAttempts > 0) {
    console.log(`✅ Карта готова после ${initAttempts} попыток`)
    initAttempts = 0
  }

  try {
    console.log('Initializing tile layer for map:', props.mapName)
    
    // Получаем handle директории
    directoryHandle = await getDirectoryHandle(props.mapName)
    if (!directoryHandle) {
      console.error('❌ Не удалось получить handle директории для карты:', props.mapName)
      return
    }

    console.log('✅ Handle директории получен для карты:', props.mapName)

    // Удаляем предыдущий слой, если он существует
    if (localTileLayer && map.hasLayer(localTileLayer)) {
      map.removeLayer(localTileLayer)
      localTileLayer = null
    }

    // Создаем кастомный tile layer
    localTileLayer = new LocalTileLayerClass(directoryHandle, {
      minZoom: props.metadata?.minZoom ?? 0,
      maxZoom: props.metadata?.maxZoom ?? 19,
      tileSize: 256,
      noWrap: true,
      keepBuffer: 6,
      attribution: 'Локальная оффлайн карта',
      // Важно: устанавливаем zIndex, чтобы слой был виден
      zIndex: 1000
    })

    console.log('✅ Tile layer создан, добавляем на карту', {
      minZoom: props.metadata?.minZoom ?? 0,
      maxZoom: props.metadata?.maxZoom ?? 19,
      mapZoom: map.getZoom(),
      mapCenter: map.getCenter()
    })

    // Добавляем слой на карту
    localTileLayer.addTo(map)
    
    // Принудительно обновляем слой, чтобы Leaflet запросил тайлы
    map.invalidateSize()
    
    console.log('✅ Tile layer успешно добавлен на карту, проверяем наличие слоя:', map.hasLayer(localTileLayer))
    initAttempts = 0 // Сбрасываем счетчик при успешной инициализации
  } catch (error) {
    console.error('❌ Ошибка инициализации локального tile layer:', error)
    console.error('Error details:', error)
  }
}

const removeTileLayer = () => {
  const map = getMapInstance()
  if (localTileLayer && map) {
    map.removeLayer(localTileLayer)
    localTileLayer = null
  }
  directoryHandle = null
}

// Следим за изменениями leafletMap напрямую
watch(() => props.leafletMap, async (newMap, oldMap) => {
  if (newMap && !oldMap && props.mapName) {
    console.log('✅ LeafletMap появился, инициализируем tile layer для:', props.mapName)
    initAttempts = 0
    // Даем карте немного времени на полную инициализацию
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 300))
    await initTileLayer()
  }
}, { immediate: true })

watch(() => props.mapName, async (newMapName, oldMapName) => {
  if (newMapName !== oldMapName) {
    console.log('🔄 Map name changed from', oldMapName, 'to', newMapName)
    removeTileLayer()
    initAttempts = 0
    if (newMapName) {
      await initTileLayer()
    }
  }
})

// Следим за изменениями metadata (может измениться при обновлении списка карт)
watch(() => props.metadata, async (newMetadata) => {
  if (newMetadata && props.mapName && getMapInstance()) {
    console.log('🔄 Metadata changed, reinitializing tile layer')
    removeTileLayer()
    initAttempts = 0
    await initTileLayer()
  }
}, { deep: true })

onMounted(async () => {
  console.log('🚀 LocalOfflineTileLayer mounted', {
    mapName: props.mapName,
    metadata: props.metadata,
    leafletMapExists: !!props.leafletMap,
    leafletMapType: typeof props.leafletMap
  })
  
  // Если карта уже передана, инициализируем сразу
  const map = getMapInstance()
  if (map && props.mapName) {
    console.log('✅ Карта уже доступна при монтировании, инициализируем сразу')
    initAttempts = 0
    await initTileLayer()
    return
  }
  
  // Если карта не готова, ждем через watch
  console.log('⏳ Карта еще не доступна при монтировании, ждем через watch')
  // Watch уже настроен и вызовет initTileLayer когда карта появится
})

onUnmounted(() => {
  removeTileLayer()
})
</script>

