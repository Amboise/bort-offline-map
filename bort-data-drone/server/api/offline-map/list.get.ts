import { listOfflineMaps } from '~/server/utils/offlineMaps'

export default defineEventHandler(async () => {
  const maps = await listOfflineMaps()
  return { maps }
})



