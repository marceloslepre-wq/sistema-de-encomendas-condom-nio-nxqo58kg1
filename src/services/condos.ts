import pb from '@/lib/pocketbase/client'

export const getCondo = async () => {
  try {
    const authCondoId = pb.authStore.record?.condo_id
    if (authCondoId) {
      try {
        return await pb.collection('condos').getOne(authCondoId)
      } catch {
        // fallback to list
      }
    }
    const records = await pb.collection('condos').getFullList()
    return records[0] || null
  } catch (e) {
    return null
  }
}

export const updateCondo = async (id: string, data: any) => {
  return pb.collection('condos').update(id, data)
}
