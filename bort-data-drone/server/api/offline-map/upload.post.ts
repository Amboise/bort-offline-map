import { createError, readMultipartFormData } from 'h3'
import {
  ensureOfflineRoot,
  mapExists,
  deleteOfflineMap,
  writeTileFromUpload,
  writeManifest,
  buildMapMetadata
} from '~/server/utils/offlineMaps'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Нет данных для загрузки' })
  }

  const mapNamePart = formData.find((part) => part.name === 'mapName' && !part.filename)
  if (!mapNamePart) {
    throw createError({ statusCode: 400, statusMessage: 'Не указано имя карты' })
  }

  const mapLabelPart = formData.find((part) => part.name === 'mapLabel' && !part.filename)
  const overwritePart = formData.find((part) => part.name === 'overwrite' && !part.filename)

  const mapName = mapNamePart.data?.toString().trim()
  if (!mapName) {
    throw createError({ statusCode: 400, statusMessage: 'Имя карты не может быть пустым' })
  }

  const overwrite = overwritePart?.data?.toString() === 'true'

  const files = formData.filter((part) => !!part.filename)
  if (!files.length) {
    throw createError({ statusCode: 400, statusMessage: 'Не выбраны тайлы для загрузки' })
  }

  await ensureOfflineRoot()

  const exists = await mapExists(mapName)
  if (exists && !overwrite) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Карта с таким именем уже существует. Включите перезапись, чтобы заменить её.'
    })
  }

  if (exists && overwrite) {
    await deleteOfflineMap(mapName)
  }

  let saved = 0
  for (const part of files) {
    if (!part.filename || !part.data) continue
    const success = await writeTileFromUpload(mapName, part.filename, part.data)
    if (success) {
      saved += 1
    }
  }

  if (saved === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Не удалось сохранить ни одного файла' })
  }

  await writeManifest(mapName, {
    label: mapLabelPart?.data?.toString().trim() || mapName,
    uploadedAt: new Date().toISOString(),
    totalFiles: saved
  })

  const metadata = await buildMapMetadata(mapName)

  return {
    map: metadata,
    savedFiles: saved
  }
})



