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
export const createMorador = async (data: any) => {
  const userPayload = {
    name: data.nome,
    email: data.email,
    password: data.password,
    passwordConfirm: data.password,
    cpf: data.cpf,
    phone: data.telefone,
    torre: data.torre,
    unidade: data.apartamento,
    role: 'morador',
  }

  console.log('Payload sent to users API:', userPayload)

  try {
    const user = await pb.collection('users').create(userPayload)

    const { password, ...moradorData } = data
    console.log('Payload sent to moradores API:', moradorData)
    return await pb.collection('moradores').create({ ...moradorData, email: user.email })
  } catch (error: any) {
    console.error('API Error during resident creation:', error.response?.data || error)
    throw error
  }
}

export const updateMorador = async (id: string, data: any) => {
  const { password, ...moradorData } = data
  console.log('Payload sent to update moradores API:', moradorData)

  try {
    const morador = await pb.collection('moradores').update(id, moradorData)

    try {
      const user = await pb
        .collection('users')
        .getFirstListItem(`cpf="${morador.cpf}" || email="${morador.email}"`)
      const userPayload: any = {
        name: morador.nome,
        cpf: morador.cpf,
        phone: morador.telefone,
        torre: morador.torre,
        unidade: morador.apartamento,
      }
      if (password && password.trim() !== '') {
        userPayload.password = password
        userPayload.passwordConfirm = password
      }
      console.log('Payload sent to update users API:', userPayload)
      await pb.collection('users').update(user.id, userPayload)
    } catch (e: any) {
      console.error(
        'User associated with morador not found or update failed',
        e.response?.data || e,
      )
    }
    return morador
  } catch (error: any) {
    console.error('API Error during resident update:', error.response?.data || error)
    throw error
  }
}
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
