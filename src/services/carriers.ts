import pb from '@/lib/pocketbase/client'

export interface Carrier {
  id: string
  name: string
  phone?: string
  created?: string
  updated?: string
}

export const getCarriers = () => pb.collection('carriers').getFullList<Carrier>()

export const getCarrier = (id: string) => pb.collection('carriers').getOne<Carrier>(id)

export const createCarrier = (data: Partial<Carrier>) =>
  pb.collection('carriers').create<Carrier>(data)

export const updateCarrier = (id: string, data: Partial<Carrier>) =>
  pb.collection('carriers').update<Carrier>(id, data)

export const deleteCarrier = (id: string) => pb.collection('carriers').delete(id)
