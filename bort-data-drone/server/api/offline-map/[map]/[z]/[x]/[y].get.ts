import { createError } from 'h3'
import { readTile } from '~/server/utils/offlineMaps'

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const mapName = params.map ? decodeURIComponent(params.map) : ''
  const { z, x, y } = params

  const tile = await readTile(mapName, z, x, y)

  if (!tile) {
    throw createError({ statusCode: 404, statusMessage: 'Тайл не найден' })
  }

  setHeader(event, 'Content-Type', tile.mime)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

  return tile.data
})

