/**
 * Composable для работы с File System Access API
 * Позволяет выбирать папки на локальном диске и сохранять разрешения
 */

const STORAGE_KEY = 'offline-maps-handles'
const TILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

/**
 * Проверяет поддержку File System Access API
 */
export const isFileSystemAccessSupported = () => {
  return 'showDirectoryPicker' in window
}

/**
 * Сохраняет handle директории в IndexedDB с полными метаданными
 */
const saveDirectoryHandle = async (mapName, handle, metadata) => {
  try {
    const dbName = 'offline-maps-db'
    const dbVersion = 2
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion)
      
      request.onerror = () => reject(request.error)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles')
        }
      }
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('handles')) {
          reject(new Error('Object store "handles" не существует'))
          return
        }
        
        const transaction = db.transaction(['handles'], 'readwrite')
        const store = transaction.objectStore('handles')
        
        if (!handle || typeof handle.getDirectoryHandle !== 'function') {
          reject(new Error('Некорректный handle директории'))
          return
        }
        
        const data = {
          mapName,
          handle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalTiles: metadata?.totalTiles || 0,
          totalSize: metadata?.totalSize || 0,
          sizeMB: metadata?.totalSize ? Number((metadata.totalSize / (1024 * 1024)).toFixed(2)) : 0,
          minZoom: metadata?.minZoom || null,
          maxZoom: metadata?.maxZoom || null,
          label: metadata?.label || mapName
        }
        
        const putRequest = store.put(data, mapName)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }
    })
  } catch (error) {
    console.error('Ошибка сохранения handle:', error)
    throw error
  }
}

/**
 * Загружает handle директории из IndexedDB
 */
const loadDirectoryHandle = async (mapName) => {
  try {
    const dbName = 'offline-maps-db'
    const dbVersion = 2
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion)
      
      request.onerror = () => reject(request.error)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles')
        }
      }
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('handles')) {
          resolve(null)
          return
        }
        
        const transaction = db.transaction(['handles'], 'readonly')
        const store = transaction.objectStore('handles')
        const getRequest = store.get(mapName)
        
        getRequest.onsuccess = () => {
          const result = getRequest.result
          if (result && result.handle) {
            const handle = result.handle
            if (typeof handle.getDirectoryHandle === 'function') {
              resolve(handle)
            } else {
              resolve(null)
            }
          } else {
            resolve(null)
          }
        }
        getRequest.onerror = () => reject(getRequest.error)
      }
    })
  } catch (error) {
    console.error('Ошибка загрузки handle:', error)
    return null
  }
}

/**
 * Удаляет handle директории из IndexedDB
 */
const removeDirectoryHandle = async (mapName) => {
  try {
    const dbName = 'offline-maps-db'
    const dbVersion = 2
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion)
      
      request.onerror = () => reject(request.error)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles')
        }
      }
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('handles')) {
          resolve()
          return
        }
        
        const transaction = db.transaction(['handles'], 'readwrite')
        const store = transaction.objectStore('handles')
        const deleteRequest = store.delete(mapName)
        
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(deleteRequest.error)
      }
    })
  } catch (error) {
    console.error('Ошибка удаления handle:', error)
    throw error
  }
}

/**
 * Получает все сохраненные handles
 */
const getAllDirectoryHandles = async () => {
  try {
    const dbName = 'offline-maps-db'
    const dbVersion = 2
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion)
      
      request.onerror = () => reject(request.error)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles')
        }
      }
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('handles')) {
          resolve([])
          return
        }
        
        const transaction = db.transaction(['handles'], 'readonly')
        const store = transaction.objectStore('handles')
        const getAllRequest = store.getAll()
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result || [])
        }
        getAllRequest.onerror = () => reject(getAllRequest.error)
      }
    })
  } catch (error) {
    console.error('Ошибка получения handles:', error)
    return []
  }
}

/**
 * Выбирает папку через File System Access API
 */
export const pickDirectory = async () => {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API не поддерживается в этом браузере')
  }
  
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'read'
    })
    return handle
  } catch (error) {
    if (error.name === 'AbortError') {
      return null
    }
    throw error
  }
}

/**
 * Сканирует директорию и собирает информацию о тайлах
 */
export const scanDirectory = async (directoryHandle, onProgress) => {
  const tiles = []
  let totalSize = 0
  const zoomLevels = new Set()
  
  const scanRecursive = async (dirHandle, relativePath = '', depth = 0) => {
    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const ext = entry.name.split('.').pop()?.toLowerCase()
          if (ext && TILE_EXTENSIONS.includes(ext)) {
            const file = await entry.getFile()
            const path = relativePath ? `${relativePath}/${entry.name}` : entry.name
            
            const pathParts = path.split('/').filter(Boolean)
            if (pathParts.length >= 3) {
              const [z, x, fileName] = pathParts.slice(-3)
              const zoom = parseInt(z, 10)
              if (!isNaN(zoom) && zoom >= 0) {
                zoomLevels.add(zoom)
              }
            }
            
            tiles.push({
              name: entry.name,
              path,
              size: file.size,
              fileHandle: entry
            })
            totalSize += file.size
            
            if (onProgress) {
              onProgress({
                processed: tiles.length,
                totalSize
              })
            }
          }
        } else if (entry.kind === 'directory') {
          const newPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
          
          if (depth === 0) {
            const zoom = parseInt(entry.name, 10)
            if (!isNaN(zoom) && zoom >= 0) {
              zoomLevels.add(zoom)
            }
          }
          
          await scanRecursive(entry, newPath, depth + 1)
        }
      }
    } catch (error) {
      console.error('Ошибка при сканировании директории:', error)
    }
  }
  
  await scanRecursive(directoryHandle)
  
  let minZoom = zoomLevels.size > 0 ? Math.min(...zoomLevels) : null
  let maxZoom = zoomLevels.size > 0 ? Math.max(...zoomLevels) : null
  
  if (minZoom === null && tiles.length > 0) {
    minZoom = 0
  }
  if (maxZoom === null && tiles.length > 0) {
    maxZoom = 19
  }
  
  return {
    tiles,
    totalSize,
    totalTiles: tiles.length,
    minZoom,
    maxZoom
  }
}

/**
 * Читает тайл из директории по пути z/x/y
 */
export const readTileFromDirectory = async (directoryHandle, z, x, y) => {
  try {
    for (const ext of TILE_EXTENSIONS) {
      try {
        const zDir = await directoryHandle.getDirectoryHandle(String(z))
        const xDir = await zDir.getDirectoryHandle(String(x))
        const fileHandle = await xDir.getFileHandle(`${y}.${ext}`)
        const file = await fileHandle.getFile()
        
        return {
          data: await file.arrayBuffer(),
          mime: ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
        }
      } catch (error) {
        continue
      }
    }
    
    // Пробуем перевернутый Y
    const maxIndex = Math.pow(2, parseInt(z, 10)) - 1
    const flippedY = maxIndex - parseInt(y, 10)
    
    if (flippedY >= 0 && flippedY !== parseInt(y, 10)) {
      for (const ext of TILE_EXTENSIONS) {
        try {
          const zDir = await directoryHandle.getDirectoryHandle(String(z))
          const xDir = await zDir.getDirectoryHandle(String(x))
          const fileHandle = await xDir.getFileHandle(`${flippedY}.${ext}`)
          const file = await fileHandle.getFile()
          
          return {
            data: await file.arrayBuffer(),
            mime: ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
          }
        } catch (error) {
          continue
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Ошибка чтения тайла:', error)
    return null
  }
}

/**
 * Регистрирует оффлайн карту с handle директории
 */
export const registerOfflineMap = async (mapName, mapLabel, directoryHandle, metadata) => {
  await saveDirectoryHandle(mapName, directoryHandle, {
    ...metadata,
    label: mapLabel || mapName
  })
  
  return {
    name: mapName,
    label: mapLabel || mapName,
    totalTiles: metadata.totalTiles,
    sizeMB: Number((metadata.totalSize / (1024 * 1024)).toFixed(2)),
    minZoom: metadata.minZoom,
    maxZoom: metadata.maxZoom,
    updatedAt: new Date().toISOString(),
    isLocal: true
  }
}

/**
 * Получает handle директории для карты
 */
export const getDirectoryHandle = async (mapName) => {
  return await loadDirectoryHandle(mapName)
}

/**
 * Удаляет регистрацию оффлайн карты
 */
export const unregisterOfflineMap = async (mapName) => {
  await removeDirectoryHandle(mapName)
}

/**
 * Получает все зарегистрированные карты
 */
export const getAllRegisteredMaps = async () => {
  const handles = await getAllDirectoryHandles()
  return handles.map(item => ({
    name: item.mapName,
    label: item.label || item.mapName,
    totalTiles: item.totalTiles || 0,
    sizeMB: item.sizeMB || 0,
    minZoom: item.minZoom || null,
    maxZoom: item.maxZoom || null,
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    createdAt: item.createdAt,
    isLocal: true
  }))
}

/**
 * Composable функция для использования в компонентах
 */
export const useFileSystemAccess = () => {
  return {
    isFileSystemAccessSupported,
    pickDirectory,
    scanDirectory,
    registerOfflineMap,
    getDirectoryHandle,
    unregisterOfflineMap,
    getAllRegisteredMaps,
    readTileFromDirectory
  }
}

