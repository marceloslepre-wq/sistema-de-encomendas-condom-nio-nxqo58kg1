import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export const getCondo = async () => {
  const records = await pb.collection('condos').getFullList()
  return records[0]
}

export const updateCondo = (id: string, data: any) => pb.collection('condos').update(id, data)

export const getUnits = () => pb.collection('units').getFullList({ sort: 'tower,apartment' })

export const getUsers = () =>
  pb.collection('users').getFullList({ expand: 'unit_id', sort: '-created' })

export const updateUser = (id: string, data: any) => pb.collection('users').update(id, data)

export const getLinks = () =>
  pb.collection('invitation_links').getFullList({ expand: 'unit_id', sort: '-created' })

export const createLink = (data: any) => pb.collection('invitation_links').create(data)

export const getParcels = () =>
  pb.collection('parcels').getFullList({ expand: 'unit_id,resident_id', sort: '-created' })

export type Parcel = RecordModel & {
  tracking_code: string
  unit_id: string
  resident_id?: string
  carrier: string
  status: string
  entry_date: string
  exit_date?: string
}

export type Unit = RecordModel & {
  tower: string
  apartment: string
}

export type AppUser = RecordModel & {
  name: string
  email: string
  cpf: string
  phone: string
  role: string
  status: string
  unit_id: string
}
