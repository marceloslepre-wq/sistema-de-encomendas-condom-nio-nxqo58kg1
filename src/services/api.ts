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

export const createParcel = (data: any) => pb.collection('parcels').create(data)
export const updateParcel = (id: string, data: any) => pb.collection('parcels').update(id, data)

export const sendSms = (phone: string) =>
  pb.send<{ success: boolean; mockCode?: string }>('/backend/v1/sms/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
    headers: { 'Content-Type': 'application/json' },
  })

export const verifySms = (phone: string, code: string) =>
  pb.send('/backend/v1/sms/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
    headers: { 'Content-Type': 'application/json' },
  })

export type Parcel = RecordModel & {
  tracking_code: string
  unit_id: string
  resident_id?: string
  carrier: string
  courier_name?: string
  courier_cpf?: string
  porter_id?: string
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
