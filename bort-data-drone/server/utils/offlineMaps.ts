import { promises as fs } from 'fs'
import { join, resolve, dirname } from 'path'

const ROOT_DIR = resolve(process.cwd(), 'offline-maps')
const TILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const MANIFEST_FILE = 'manifest.json'

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true })
}

export const ensureOfflineRoot = async () => ensureDir(ROOT_DIR)

const sanitizeMapName = (name: string) => {
  if (!name) return ''
  return name
    .toString()
    .trim()
    .replace(/[\0<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

const getMapDir = (mapName: string) => {
  const safeName = sanitizeMapName(mapName)
  return join(ROOT_DIR, safeName)
}

const sanitizeTileSegment = (segment: string) => {
  if (!segment) return ''
  const cleaned = segment.toString().trim()
  if (!/^\d+$/.test(cleaned)) return ''
  return cleaned
}

const sanitizeTileFilename = (filename: string) => {
  if (!filename) return ''
  const clean = filename.replace(/\\/g, '/').split('/').pop() || ''
  const [base, ext] = clean.split('.')
  if (!base || !/^\d+$/.test(base)) return ''
  if (!ext || !TILE_EXTENSIONS.includes(ext.toLowerCase())) return ''
  return `${base}.${ext.toLowerCase()}`
}

const normalizeRelativeTilePath = (relativePath: string) => {
  if (!relativePath) return null
  const normalized = relativePath.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length < 3) return null
  const lastSegments = segments.slice(-3)
  const [z, x, fileName] = lastSegments
  const safeZ = sanitizeTileSegment(z)
  const safeX = sanitizeTileSegment(x)
  const safeFile = sanitizeTileFilename(fileName)
  if (!safeZ || !safeX || !safeFile) return null
  return `${safeZ}/${safeX}/${safeFile}`
}

const pathExists = async (target: string) => {
  try {
    await fs.stat(target)
    return true
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

export const writeTileFromUpload = async (mapName: string, relativePath: string, data: Buffer) => {
  const safeRelative = normalizeRelativeTilePath(relativePath)
  if (!safeRelative) {
    return false
  }
  const destination = join(getMapDir(mapName), safeRelative)
  await ensureDir(dirname(destination))
  await fs.writeFile(destination, data)
  return true
}

export const writeManifest = async (mapName: string, manifest: Record<string, any>) => {
  const dir = getMapDir(mapName)
  await ensureDir(dir)
  await fs.writeFile(join(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2), 'utf-8')
}

const readManifest = async (mapName: string) => {
  const dir = getMapDir(mapName)
  try {
    const raw = await fs.readFile(join(dir, MANIFEST_FILE), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

type WalkStats = {
  tiles: number
  bytes: number
}

const walkTileDirectory = async (dir: string): Promise<WalkStats> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  let tiles = 0
  let bytes = 0

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const child = await walkTileDirectory(fullPath)
      tiles += child.tiles
      bytes += child.bytes
    } else if (entry.isFile()) {
      const ext = entry.name.split('.').pop()?.toLowerCase()
      if (ext && TILE_EXTENSIONS.includes(ext)) {
        tiles += 1
        const stat = await fs.stat(fullPath)
        bytes += stat.size
      }
    }
  }

  return { tiles, bytes }
}

export const buildMapMetadata = async (mapName: string) => {
  const safeName = sanitizeMapName(mapName)
  const dir = getMapDir(safeName)
  const exists = await pathExists(dir)
  if (!exists) {
    return null
  }

  const entries = await fs.readdir(dir, { withFileTypes: true })
  const zoomLevels: number[] = []
  let totalTiles = 0
  let totalBytes = 0

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const zoom = Number.parseInt(entry.name, 10)
    if (Number.isNaN(zoom)) continue
    zoomLevels.push(zoom)
    const stats = await walkTileDirectory(join(dir, entry.name))
    totalTiles += stats.tiles
    totalBytes += stats.bytes
  }

  const dirStat = await fs.stat(dir)
  const manifest = await readManifest(mapName)

  return {
    name: safeName,
    minZoom: zoomLevels.length ? Math.min(...zoomLevels) : null,
    maxZoom: zoomLevels.length ? Math.max(...zoomLevels) : null,
    totalTiles,
    sizeMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    label: manifest?.label || safeName,
    updatedAt: dirStat.mtime.toISOString()
  }
}

export const listOfflineMaps = async () => {
  await ensureOfflineRoot()
  const entries = await fs.readdir(ROOT_DIR, { withFileTypes: true }).catch(() => [])
  const maps = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const metadata = await buildMapMetadata(entry.name)
    if (metadata) {
      maps.push(metadata)
    }
  }

  return maps.sort((a, b) => (a.name > b.name ? 1 : -1))
}

export const deleteOfflineMap = async (mapName: string) => {
  const dir = getMapDir(mapName)
  const exists = await pathExists(dir)
  if (!exists) return false
  await fs.rm(dir, { recursive: true, force: true })
  return true
}

const sanitizeTileRequest = (value: string) => {
  if (!value) return ''
  const cleaned = value.toString().split('.')[0]
  if (!/^\d+$/.test(cleaned)) return ''
  return cleaned
}

export const readTile = async (mapName: string, z: string, x: string, y: string) => {
  const safeZ = sanitizeTileRequest(z)
  const safeX = sanitizeTileRequest(x)
  const safeY = sanitizeTileRequest(y)

  if (!safeZ || !safeX || !safeY) {
    return null
  }

  const dir = getMapDir(mapName)
  const exists = await pathExists(dir)
  if (!exists) return null

  const numericZ = Number.parseInt(safeZ, 10)
  const numericY = Number.parseInt(safeY, 10)
  const yVariants = [safeY]

  if (!Number.isNaN(numericZ) && !Number.isNaN(numericY)) {
    const maxIndex = Math.pow(2, numericZ) - 1
    const flippedY = maxIndex - numericY
    if (flippedY >= 0 && flippedY !== numericY) {
      yVariants.push(String(flippedY))
    }
  }

  for (const yVariant of yVariants) {
    for (const ext of TILE_EXTENSIONS) {
      const filePath = join(dir, safeZ, safeX, `${yVariant}.${ext}`)
      try {
        const buffer = await fs.readFile(filePath)
        return {
          data: buffer,
          mime: ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
        }
      } catch (error: any) {
        if (error?.code === 'ENOENT') {
          continue
        }
        throw error
      }
    }
  }

  return null
}

export const mapExists = async (mapName: string) => {
  const dir = getMapDir(mapName)
  return pathExists(dir)
}

