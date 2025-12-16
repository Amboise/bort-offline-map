import { createError } from 'h3'
import { deleteOfflineMap, mapExists } from '~/server/utils/offlineMaps'

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const mapName = params.map ? decodeURIComponent(params.map) : ''

  if (!mapName) {
    throw createError({ statusCode: 400, statusMessage: 'Не указано имя карты' })
  }

  const exists = await mapExists(mapName)
  if (!exists) {
    throw createError({ statusCode: 404, statusMessage: 'Карта не найдена' })
  }

  await deleteOfflineMap(mapName)

  return { ok: true }
})

