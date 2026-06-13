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

  // Create user first. Any unique constraint error will be thrown to the caller.
  await pb.collection('users').create(userPayload)

  // Create morador with strictly defined payload
  const { password, ...moradorData } = data
  return await pb.collection('moradores').create({
    nome: moradorData.nome,
    email: moradorData.email,
    cpf: moradorData.cpf,
    torre: moradorData.torre,
    apartamento: moradorData.apartamento,
    telefone: moradorData.telefone || '',
  })
}

export const updateMorador = async (id: string, data: any) => {
  const { password, ...moradorData } = data

  const originalMorador = await pb.collection('moradores').getOne(id)

  let user: any
  try {
    user = await pb
      .collection('users')
      .getFirstListItem(`cpf="${originalMorador.cpf}" || email="${originalMorador.email}"`)
  } catch {
    /* intentionally ignored */
  }

  if (user) {
    const userPayload: any = {}

    if (moradorData.nome && moradorData.nome !== user.name) userPayload.name = moradorData.nome
    if (moradorData.email && moradorData.email !== user.email) userPayload.email = moradorData.email
    if (moradorData.cpf && moradorData.cpf !== user.cpf) userPayload.cpf = moradorData.cpf
    if (moradorData.telefone && moradorData.telefone !== user.phone)
      userPayload.phone = moradorData.telefone
    if (moradorData.torre && moradorData.torre !== user.torre) userPayload.torre = moradorData.torre
    if (moradorData.apartamento && moradorData.apartamento !== user.unidade)
      userPayload.unidade = moradorData.apartamento

    if (password && password.trim() !== '') {
      userPayload.password = password
      userPayload.passwordConfirm = password
    }

    if (Object.keys(userPayload).length > 0) {
      if (['gestor', 'admin'].includes(pb.authStore.record?.role || '')) {
        await adminUpdateUser(user.id, userPayload)
      } else {
        await updateUser(user.id, userPayload)
      }
    }
  }

  const updatePayload: any = {}
  if (moradorData.nome !== undefined && String(moradorData.nome).trim() !== '')
    updatePayload.nome = moradorData.nome
  if (moradorData.email !== undefined && String(moradorData.email).trim() !== '')
    updatePayload.email = moradorData.email
  if (moradorData.cpf !== undefined && String(moradorData.cpf).trim() !== '')
    updatePayload.cpf = moradorData.cpf
  if (moradorData.torre !== undefined && String(moradorData.torre).trim() !== '')
    updatePayload.torre = moradorData.torre
  if (moradorData.apartamento !== undefined && String(moradorData.apartamento).trim() !== '')
    updatePayload.apartamento = moradorData.apartamento
  if (moradorData.telefone !== undefined) updatePayload.telefone = moradorData.telefone || ''

  if (Object.keys(updatePayload).length > 0) {
    return await pb.collection('moradores').update(id, updatePayload)
  }

  return originalMorador
}
export const deleteMorador = (id: string) => pb.collection('moradores').delete(id)

export const getUsers = () => pb.collection('users').getFullList({ sort: '-created' })

export const updateUser = async (id: string, data: any) => {
  const existingRecord = await pb.collection('users').getOne(id)
  const payload: any = {}

  const allowedFields = [
    'name',
    'phone',
    'role',
    'cpf',
    'torre',
    'unidade',
    'permitir_retirada_terceiros',
  ]

  allowedFields.forEach((field) => {
    if (field in data) {
      const newValue = data[field] === null ? '' : data[field]
      const existingValue =
        existingRecord[field] === null || existingRecord[field] === undefined
          ? ''
          : existingRecord[field]
      if (newValue !== existingValue) {
        payload[field] = newValue
      }
    }
  })

  if (data.email && data.email !== existingRecord.email) {
    payload.email = data.email
  }

  if (data.password && String(data.password).trim() !== '') {
    payload.password = data.password
    payload.passwordConfirm = data.passwordConfirm || data.password
  }

  if (Object.keys(payload).length === 0) return existingRecord

  return pb.send(`/backend/v1/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const adminUpdateUser = async (id: string, data: any) => {
  const existingRecord = await pb.collection('users').getOne(id)
  const payload: any = {}

  const allowedFields = [
    'name',
    'phone',
    'role',
    'cpf',
    'torre',
    'unidade',
    'permitir_retirada_terceiros',
  ]

  allowedFields.forEach((field) => {
    if (field in data) {
      const newValue = data[field] === null ? '' : data[field]
      const existingValue =
        existingRecord[field] === null || existingRecord[field] === undefined
          ? ''
          : existingRecord[field]
      if (newValue !== existingValue) {
        payload[field] = newValue
      }
    }
  })

  if (data.email && data.email !== existingRecord.email) {
    payload.email = data.email
  }

  if (data.password && String(data.password).trim() !== '') {
    payload.password = data.password
    payload.passwordConfirm = data.passwordConfirm || data.password
  }

  if (Object.keys(payload).length === 0) return existingRecord

  return pb.send(`/backend/v1/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const createUser = (data: any) => {
  const payload: any = {}

  const allowedFields = ['name', 'email', 'phone', 'role', 'cpf', 'torre', 'unidade']

  allowedFields.forEach((field) => {
    if (field in data) {
      payload[field] = data[field] === null ? '' : data[field]
    }
  })

  if (data.password && String(data.password).trim() !== '') {
    payload.password = data.password
    payload.passwordConfirm = data.passwordConfirm || data.password
  }

  return pb.collection('users').create(payload)
}
export const deleteUser = (id: string) => pb.collection('users').delete(id)

export type InvitationLink = RecordModel & {
  role: string
  torre?: string
  unidade?: string
  token: string
  active: boolean
}

export const getInvitations = () =>
  pb
    .collection('invitation_links')
    .getFullList<InvitationLink>({ sort: '-created', requestKey: null })

export const createInvitation = async (data: any) => {
  return await pb.collection('invitation_links').create<InvitationLink>(data, {
    requestKey: null,
  })
}

export const deleteInvitation = (id: string) =>
  pb.collection('invitation_links').delete(id, { requestKey: null })

export const getPublicInvitation = (token: string) =>
  pb.send(`/backend/v1/invitations/${token}`, { method: 'GET' })
export const registerWithInvitation = (token: string, data: any) =>
  pb.send(`/backend/v1/invitations/${token}/register`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })

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
