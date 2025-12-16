<template>
  <div class="offline-map-modal">
    <div class="offline-map-modal__layout">
      <!-- Секция для локальной папки (без загрузки) -->
      <section class="offline-map-modal__upload offline-map-modal__local">
        <header class="offline-map-modal__section-header">
          <h4>⚡ Локальная карта </h4>
        </header>

        <div class="offline-map-modal__field">
          <label for="local-map-name">Название карты</label>
          <input
            id="local-map-name"
            v-model="localMapLabel"
            type="text"
            placeholder="Например, Moscow-Center"
          />
        </div>

        <div class="offline-map-modal__actions">
          <button
            class="offline-map-modal__primary"
            :disabled="isRegisteringLocal"
            @click="registerLocalMap"
          >
            {{ isRegisteringLocal ? 'Сканирование...' : '📁 Выбрать папку и зарегистрировать' }}
          </button>
        </div>

        <div
          v-if="isRegisteringLocal"
          class="offline-map-modal__progress"
        >
          <div class="offline-map-modal__progress-bar">
            <div
              class="offline-map-modal__progress-fill offline-map-modal__progress-fill--local"
            ></div>
          </div>
          <div class="offline-map-modal__progress-meta">
            <span>{{ localProgressText }}</span>
          </div>
        </div>

        <p v-if="localMessage" class="offline-map-modal__status">
          {{ localMessage }}
        </p>
        <p v-if="localError" class="offline-map-modal__status offline-map-modal__status--error">
          {{ localError }}
        </p>
      </section>

      <section class="offline-map-modal__list">
        <header class="offline-map-modal__section-header">
          <h4>Доступные карты</h4>
          <button 
            class="offline-map-modal__refresh" 
            type="button" 
            :disabled="isLoadingMaps"
            @click="refreshOfflineMaps"
          >
            {{ isLoadingMaps ? '⏳ Загрузка...' : '🔄 Обновить' }}
          </button>
        </header>

        <!-- Лоадер при загрузке -->
        <div v-if="isLoadingMaps" class="offline-map-modal__loading">
          <div class="offline-map-modal__spinner-small"></div>
          <p>Загрузка списка карт...</p>
        </div>

        <!-- Пустое состояние -->
        <p v-else-if="!store.offlineMaps.length" class="offline-map-modal__empty">
          Пока нет загруженных оффлайн-карт.
        </p>

        <!-- Список карт -->
        <ul v-else class="offline-map-modal__cards">
          <li
            v-for="map in store.offlineMaps"
            :key="map.name"
            :class="[
              'offline-map-modal__card',
              { 'offline-map-modal__card--active': map.name === store.activeOfflineMap }
            ]"
          >
            <div class="offline-map-modal__card-header">
              <strong>{{ map.label || map.name }}</strong>
              <span>Zoom: {{ formatZoom(map) }}</span>
            </div>
            <p class="offline-map-modal__card-meta">
              {{ map.totalTiles }} тайлов • {{ map.sizeMB }} МБ
            </p>
            <p class="offline-map-modal__card-updated">
              Обновлено: {{ formatUpdatedAt(map.updatedAt) }}
            </p>
            <div class="offline-map-modal__card-actions">
              <button type="button" @click="selectActiveMap(map.name)">
                {{ map.name === store.activeOfflineMap ? 'Выбрано' : 'Использовать' }}
              </button>
              <button type="button" class="danger" @click="removeOfflineMap(map.name)">
                Удалить
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>

  <div v-if="isDeletingMap" class="offline-map-modal__blocking-overlay">
    <div class="offline-map-modal__loader">
      <div class="offline-map-modal__spinner"></div>
      <p>Удаляем карту...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  isFileSystemAccessSupported,
  pickDirectory,
  scanDirectory,
  registerOfflineMap as registerOfflineMapFS,
  getAllRegisteredMaps,
  unregisterOfflineMap
} from '~/composables/useFileSystemAccess.js'

const store = useMainStore()
const isDeletingMap = ref(false)
const isLoadingMaps = ref(false)

// Локальная карта (без загрузки)
const localMapLabel = ref('')
const isRegisteringLocal = ref(false)
const localMessage = ref('')
const localError = ref('')
const localProgressText = ref('Подготовка...')

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 Б'
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  const formatted = value < 10 && unitIndex > 0 ? value.toFixed(1) : Math.round(value).toString()
  return `${formatted} ${units[unitIndex]}`
}

const safeParseJSON = (payload: string | null | undefined) => {
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `offline-map-${Date.now()}`
}

const refreshOfflineMaps = async () => {
  isLoadingMaps.value = true
  try {
    // Получаем только локальные карты из File System Access API
    const localMaps = await getAllRegisteredMaps()
    store.setOfflineMaps(localMaps)
  } catch (error: any) {
    console.error('Ошибка загрузки списка карт:', error)
    localError.value = 'Не удалось обновить список карт'
  } finally {
    isLoadingMaps.value = false
  }
}

const selectActiveMap = (mapName: string) => {
  store.setActiveOfflineMap(mapName)
}

const removeOfflineMap = async (mapName: string) => {
  if (!confirm(`Удалить оффлайн карту "${mapName}"?`)) return
  isDeletingMap.value = true
  try {
    // Удаляем локальную карту (из IndexedDB)
    await unregisterOfflineMap(mapName)
    
    if (store.activeOfflineMap === mapName) {
      store.setActiveOfflineMap(null)
    }
    await refreshOfflineMaps()
  } catch (error: any) {
    localError.value = 'Не удалось удалить карту'
  } finally {
    isDeletingMap.value = false
  }
}

const registerLocalMap = async () => {
  if (!localMapLabel.value.trim()) {
    localError.value = 'Введите название карты'
    return
  }

  if (!isFileSystemAccessSupported()) {
    localError.value = 'Ваш браузер не поддерживает File System Access API. Используйте Chrome или Edge.'
    return
  }

  isRegisteringLocal.value = true
  localMessage.value = ''
  localError.value = ''
  localProgressText.value = 'Выберите папку с тайлами...'

  try {
    // Выбираем папку
    const directoryHandle = await pickDirectory()
    if (!directoryHandle) {
      localError.value = 'Выбор папки отменён'
      return
    }

    localProgressText.value = 'Сканирование папки...'

    const mapName = slugify(localMapLabel.value)
    const duplicateExists = store.offlineMaps.some((map) => map.name === mapName)
    
    if (duplicateExists) {
      localError.value = 'Карта с таким названием уже существует. Смените имя.'
      return
    }

    // Сканируем папку
    const metadata = await scanDirectory(directoryHandle, (progress) => {
      localProgressText.value = `Сканирование: ${progress.processed} файлов...`
    })

    if (metadata.totalTiles === 0) {
      localError.value = 'В папке не найдены тайлы (png, jpg, jpeg, webp)'
      return
    }

    localProgressText.value = 'Сохранение...'

    // Регистрируем карту
    await registerOfflineMapFS(mapName, localMapLabel.value, directoryHandle, metadata)

    localMessage.value = `✅ Карта "${localMapLabel.value}" зарегистрирована! Найдено ${metadata.totalTiles} тайлов (${(metadata.totalSize / (1024 * 1024)).toFixed(2)} МБ)`
    
    await refreshOfflineMaps()
    store.setActiveOfflineMap(mapName)
    
    // Очищаем форму
    setTimeout(() => {
      localMapLabel.value = ''
      localMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Ошибка регистрации локальной карты:', error)
    localError.value = error?.message || 'Ошибка регистрации карты'
  } finally {
    isRegisteringLocal.value = false
  }
}

const formatZoom = (map: any) => {
  const minZoom = map.minZoom ?? 0
  const maxZoom = map.maxZoom ?? 19
  
  if (minZoom === maxZoom) return String(minZoom)
  return `${minZoom}–${maxZoom}`
}

const formatUpdatedAt = (value: string) => {
  if (!value) return 'неизвестно'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

onMounted(() => {
  // Всегда загружаем список карт при открытии модального окна
  refreshOfflineMaps()
})
</script>

<style scoped lang="scss">
.offline-map-modal {
  width: 100%;
  max-width: 900px;
}

.offline-map-modal__layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.offline-map-modal__local {
  background: #f0fdf4;
  border: 2px solid #10b981;
}

.offline-map-modal__progress-fill--local {
  background: linear-gradient(90deg, #10b981, #34d399);
  width: 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

.offline-map-modal__upload,
.offline-map-modal__list {
  background: #f7f9fc;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.offline-map-modal__section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h4 {
    margin: 0;
  }

  p {
    margin: 4px 0 0;
    font-size: 0.9rem;
    color: #6b7280;
  }
}

.offline-map-modal__dropzone {
  border: 2px dashed #94a3b8;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.6);
}

.offline-map-modal__dropzone--active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
}

.offline-map-modal__dropzone--ready {
  border-color: #16a34a;
}

.offline-map-modal__dropzone-icon {
  font-size: 2rem;
}

.offline-map-modal__select-button {
  margin-top: 12px;
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}

.offline-map-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;

  label {
    font-weight: 600;
  }

  input {
    border-radius: 8px;
    border: 1px solid #cbd5f5;
    padding: 8px 12px;
  }
}

.offline-map-modal__actions {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.offline-map-modal__primary {
  flex: 1;
  padding: 10px 16px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.offline-map-modal__primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.offline-map-modal__secondary {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}

.offline-map-modal__progress {
  margin-bottom: 12px;
}

.offline-map-modal__progress--folder .offline-map-modal__progress-fill {
  background: linear-gradient(90deg, #a855f7, #6366f1);
}

.offline-map-modal__progress--upload .offline-map-modal__progress-fill {
  background: linear-gradient(90deg, #2563eb, #38bdf8);
}

.offline-map-modal__progress-bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  position: relative;
}

.offline-map-modal__progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 0%;
  background: linear-gradient(90deg, #2563eb, #38bdf8);
  transition: width 0.2s ease;
}

.offline-map-modal__progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #475569;
  margin-top: 6px;
}

.offline-map-modal__status {
  font-size: 0.9rem;
  color: #166534;
}

.offline-map-modal__status--error {
  color: #dc2626;
}

.offline-map-modal__refresh {
  border: none;
  background: transparent;
  cursor: pointer;
  transition: opacity 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.offline-map-modal__cards {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.offline-map-modal__card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.offline-map-modal__card--active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.3);
}

.offline-map-modal__card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.offline-map-modal__card-meta {
  margin: 0;
  color: #4b5563;
}

.offline-map-modal__card-updated {
  margin: 4px 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.offline-map-modal__card-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;

  button {
    flex: 1;
    border: none;
    border-radius: 10px;
    padding: 8px 0;
    cursor: pointer;
    background: #2563eb;
    color: #fff;
  }

  .danger {
    background: #dc2626;
  }
}

.offline-map-modal__empty {
  margin: 0;
  color: #6b7280;
  text-align: center;
  padding: 20px;
}

.offline-map-modal__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 16px;

  p {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
  }
}

.offline-map-modal__spinner-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  animation: offline-map-spin 0.8s linear infinite;
}

.offline-map-modal__blocking-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
  backdrop-filter: blur(2px);
}

.offline-map-modal__loader {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px 32px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 240px;
}

.offline-map-modal__spinner {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  animation: offline-map-spin 0.8s linear infinite;
}

.offline-map-modal__loader p {
  margin: 0;
  font-weight: 600;
  color: #0f172a;
}

@keyframes offline-map-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

