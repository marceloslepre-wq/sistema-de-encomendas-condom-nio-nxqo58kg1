import pb from '@/lib/pocketbase/client'
import { getActiveCondoId, isSupportModeActive } from './supportSession'

export interface Carrier {
  id: string
  name: string
  phone?: string
  created?: string
  updated?: string
}

export const getCarriers = () => {
  const activeCondoId = getActiveCondoId()
  const isMaster = pb.authStore.record?.role === 'master' || pb.authStore.record?.role === 'admin'
  const inSupport = isSupportModeActive()
  const filter = (!isMaster || inSupport) && activeCondoId ? `condo_id = "${activeCondoId}"` : ''
  return pb.collection('carriers').getFullList<Carrier>({ filter })
}

export const getCarrier = (id: string) => pb.collection('carriers').getOne<Carrier>(id)

export const createCarrier = (data: Partial<Carrier>) => {
  const activeCondoId = getActiveCondoId()
  const payload: any = { ...data }
  if (activeCondoId && !payload.condo_id) payload.condo_id = activeCondoId
  return pb.collection('carriers').create<Carrier>(payload)
}

export const updateCarrier = (id: string, data: Partial<Carrier>) =>
  pb.collection('carriers').update<Carrier>(id, data)

export const deleteCarrier = (id: string) => pb.collection('carriers').delete(id)
