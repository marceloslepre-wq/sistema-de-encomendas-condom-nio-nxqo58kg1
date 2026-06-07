import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export const getCondo = async () => {
  const records = await pb.collection('condos').getFullList()
  return records[0]
}

export const createCondo = (data: any) => pb.collection('condos').create(data)

export const updateCondo = (id: string, data: any) => pb.collection('condos').update(id, data)

export const getUnits = () => pb.collection('units').getFullList({ sort: 'tower,apartment' })
export const createUnit = (data: any) => pb.collection('units').create(data)
export const updateUnit = (id: string, data: any) => pb.collection('units').update(id, data)
export const deleteUnit = (id: string) => pb.collection('units').delete(id)

export type Morador = RecordModel & {
  nome: string
  email: string
  cpf: string
  torre: string
  apartamento: string
  telefone: string
}

export const getMoradores = () => pb.collection('moradores').getFullList({ sort: '-created' })
export const createMorador = (data: any) => pb.collection('moradores').create(data)
export const updateMorador = (id: string, data: any) => pb.collection('moradores').update(id, data)
export const deleteMorador = (id: string) => pb.collection('moradores').delete(id)

export const getUsers = () => pb.collection('users').getFullList({ sort: '-created' })

export const updateUser = (id: string, data: any) => {
  const payload: any = {}

  const allowedFields = ['name', 'email', 'phone', 'role']

  allowedFields.forEach((field) => {
    if (field in data) {
      payload[field] = data[field]
    }
  })

  if (data.password && String(data.password).trim() !== '') {
    payload.password = data.password
    payload.passwordConfirm = data.passwordConfirm || data.password
  }

  return pb.collection('users').update(id, payload)
}

export const adminUpdateUser = updateUser

export const createUser = (data: any) => {
  const payload: any = {}

  const allowedFields = ['name', 'email', 'phone', 'role']

  allowedFields.forEach((field) => {
    if (field in data) {
      payload[field] = data[field]
    }
  })

  if (data.password && String(data.password).trim() !== '') {
    payload.password = data.password
    payload.passwordConfirm = data.passwordConfirm || data.password
  }

  return pb.collection('users').create(payload)
}
export const deleteUser = (id: string) => pb.collection('users').delete(id)

export const getCarriers = () => pb.collection('carriers').getFullList({ sort: 'name' })
export const createCarrier = (data: any) => pb.collection('carriers').create(data)
export const updateCarrier = (id: string, data: any) => pb.collection('carriers').update(id, data)
export const deleteCarrier = (id: string) => pb.collection('carriers').delete(id)

export const getLinks = () =>
  pb.collection('invitation_links').getFullList({ expand: 'unit_id', sort: '-created' })

export const createLink = (data: any) => pb.collection('invitation_links').create(data)

export const getParcels = () =>
  pb
    .collection('recebimentos_auditoria')
    .getFullList({ expand: 'unidade_id,morador_id', sort: '-created' })

export const getVolumeTypes = () => pb.collection('volume_types').getFullList()
export const createVolumeType = (data: any) => pb.collection('volume_types').create(data)
export const updateVolumeType = (id: string, data: any) =>
  pb.collection('volume_types').update(id, data)
export const deleteVolumeType = (id: string) => pb.collection('volume_types').delete(id)

export const getShelfLocations = () => pb.collection('shelf_locations').getFullList()
export const createShelfLocation = (data: any) => pb.collection('shelf_locations').create(data)
export const updateShelfLocation = (id: string, data: any) =>
  pb.collection('shelf_locations').update(id, data)
export const deleteShelfLocation = (id: string) => pb.collection('shelf_locations').delete(id)

export const createParcel = (data: any) => pb.collection('recebimentos_auditoria').create(data)
export const updateParcel = (id: string, data: any) =>
  pb.collection('recebimentos_auditoria').update(id, data)
export const updateParcelWithFormData = (id: string, formData: FormData) =>
  pb.collection('recebimentos_auditoria').update(id, formData)
export const createParcelWithFormData = (formData: FormData) =>
  pb.collection('recebimentos_auditoria').create(formData)
export const updateRecebimentoAuditoria = (id: string, data: any) =>
  pb.collection('recebimentos_auditoria').update(id, data)
export const getFileUrl = (record: any, filename: string) => pb.files.getUrl(record, filename)

export const createRecebimentoAuditoria = (data: any) =>
  pb.collection('recebimentos_auditoria').create(data)

export const getRecebimentosAuditoria = (page = 1, filter = '') =>
  pb.collection('recebimentos_auditoria').getList(page, 20, {
    filter,
    sort: '-created',
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
  volumes?: number
  photo?: string

  shelf_location?: string
  volume_type?: string
  codigo_retirada?: string
}

export type Unit = RecordModel & {
  tower: string
  apartment: string
}

export type Carrier = RecordModel & {
  name: string
  phone?: string
}

export const getInvitationLinkByToken = (token: string) =>
  pb.collection('invitation_links').getFirstListItem(`token="${token}"`, { expand: 'unit_id' })

export const updateInvitationLink = (id: string, data: any) =>
  pb.collection('invitation_links').update(id, data)

export const getUnitParcels = (unitId: string, page = 1, filter = '') =>
  pb.collection('recebimentos_auditoria').getList<any>(page, 20, {
    filter: `unidade_id="${unitId}"${filter ? ` && (${filter})` : ''}`,
    sort: '-created',
  })

export const getParcelById = (id: string) =>
  pb.collection('recebimentos_auditoria').getOne<any>(id, { expand: 'unidade_id' })

export const getParcelAuditLogs = (parcelId: string) =>
  pb.collection('audit_logs').getFullList({ filter: `parcel_id="${parcelId}"`, sort: '-created' })

export type RecebimentoAuditoria = RecordModel & {
  unidade?: string
  morador?: string
  volume?: string
  transportadora?: string
  status?: string
  data_criacao?: string
  entregador_nome?: string
  entregador_cpf?: string
  codigo_rastreio?: string
  observacoes?: string
  unidade_id?: string
  morador_id?: string
  recebido_por?: string
  codigo_retirada?: string
}

export type AppUser = RecordModel & {
  name: string
  email: string
  phone: string
  role: string
}
