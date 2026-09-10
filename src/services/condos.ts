import pb from '@/lib/pocketbase/client'

export interface CondoRecord {
  id: string
  name: string
  cnpj?: string
  email?: string
  cidade?: string
  estado?: string
  responsavel?: string
  phone?: string
  address?: string
  logo?: string
  janitor_settings?: any
  created?: string
  updated?: string
}

export const getCondo = async (): Promise<CondoRecord | null> => {
  try {
    const authCondoId = pb.authStore.record?.condo_id
    if (authCondoId) {
      try {
        return (await pb.collection('condos').getOne(authCondoId)) as unknown as CondoRecord
      } catch {
        // fallback to list
      }
    }
    const records = await pb.collection('condos').getFullList()
    return (records[0] as unknown as CondoRecord) || null
  } catch (e) {
    return null
  }
}

export const updateCondo = async (id: string, data: any) => {
  return pb.collection('condos').update(id, data)
}
