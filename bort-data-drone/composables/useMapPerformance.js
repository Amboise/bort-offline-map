/**
 * Композабл для оптимизации производительности карт
 */
export const useMapPerformance = () => {
  // Настройки тайлов для максимальной производительности
  const getTileOptions = (layerType = 'standard') => {
    const baseOptions = {
      tileSize: 256,
      updateWhenIdle: false,
      updateWhenZooming: false,
      keepBuffer: 2,
      detectRetina: true,
      crossOrigin: false,
      minZoom: 1,
      loading: 'eager',
      fadeAnimation: true,
      zoomAnimation: true
    }

    const layerSpecific = {
      standard: {
        maxZoom: 19,
        maxNativeZoom: 19,
        subdomains: ['a', 'b', 'c'],
        keepBuffer: 3,
        updateWhenIdle: true
      },
      satellite: {
        maxZoom: 19,
        maxNativeZoom: 19,
        keepBuffer: 2
      },
      topo: {
        maxZoom: 17,
        maxNativeZoom: 17,
        subdomains: ['a', 'b', 'c'],
        keepBuffer: 2
      },
      dark: {
        maxZoom: 19,
        maxNativeZoom: 19,
        subdomains: ['a', 'b', 'c', 'd'],
        keepBuffer: 2
      }
    }

    return {
      ...baseOptions,
      ...layerSpecific[layerType]
    }
  }

  const getMapOptions = () => {
    return {
      preferCanvas: true,
      zoomSnap: 1,
      zoomDelta: 1,
      wheelPxPerZoomLevel: 60,
      maxBoundsViscosity: 1.0,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      worldCopyJump: false,
      closePopupOnClick: true,
      bounceAtZoomLimits: true,
      tap: true,
      tapTolerance: 15,
      doubleClickZoom: true,
      keyboard: true,
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
      boxZoom: true,
      trackResize: true,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 1500,
      easeLinearity: 0.2,
      worldCopyJump: false,
      maxBoundsViscosity: 1.0
    }
  }

  // Предзагрузка тайлов для улучшения производительности
  const preloadTiles = (map, layer, bounds, minZoom, maxZoom) => {
    if (!map || !layer) return

    const tileLayer = layer._layer || layer
    
    for (let z = minZoom; z <= maxZoom; z++) {
      const tileBounds = bounds.toBBoxString()
      if (tileLayer.getTileUrl) {
        const url = tileLayer.getTileUrl({
          x: Math.floor(bounds.getCenter().lng),
          y: Math.floor(bounds.getCenter().lat),
          z: z
        })
        
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = url
      }
    }
  }

  const optimizeForMobile = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      return {
        keepBuffer: 1,
        zoomAnimation: true,
        fadeAnimation: false,
        markerZoomAnimation: false,
        tapTolerance: 20,
        touchZoom: true,
        bounceAtZoomLimits: false
      }
    }
    
    return {}
  }

  // Мониторинг производительности
  const monitorPerformance = (map) => {
    if (!map) return

    let tileLoadStart = 0
    let tileLoadCount = 0

    map.on('tileloadstart', () => {
      if (tileLoadCount === 0) {
        tileLoadStart = performance.now()
      }
      tileLoadCount++
    })

    map.on('tileload', () => {
      tileLoadCount--
      if (tileLoadCount === 0) {
        const loadTime = performance.now() - tileLoadStart
      }
    })

    map.on('tileerror', (e) => {
      console.warn('Tile load error:', e)
    })
  }

  return {
    getTileOptions,
    getMapOptions,
    preloadTiles,
    optimizeForMobile,
    monitorPerformance
  }
}
