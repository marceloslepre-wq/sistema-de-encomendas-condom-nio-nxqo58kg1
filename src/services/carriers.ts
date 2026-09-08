import pb from '@/lib/pocketbase/client'

export interface Carrier {
  id: string
  name: string
  phone?: string
  created?: string
  updated?: string
}

export const getCarriers = () => {
  const authCondoId = pb.authStore.record?.condo_id
  const isMaster = pb.authStore.record?.role === 'master' || pb.authStore.record?.role === 'admin'
  const filter = !isMaster && authCondoId ? `condo_id = "${authCondoId}"` : ''
  return pb.collection('carriers').getFullList<Carrier>({ filter })
}

export const getCarrier = (id: string) => pb.collection('carriers').getOne<Carrier>(id)

export const createCarrier = (data: Partial<Carrier>) => {
  const authCondoId = pb.authStore.record?.condo_id
  const payload: any = { ...data }
  if (authCondoId && !payload.condo_id) payload.condo_id = authCondoId
  return pb.collection('carriers').create<Carrier>(payload)
}

export const updateCarrier = (id: string, data: Partial<Carrier>) =>
  pb.collection('carriers').update<Carrier>(id, data)

export const deleteCarrier = (id: string) => pb.collection('carriers').delete(id)
