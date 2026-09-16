import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export type Tower = RecordModel & {
  condo_id: string
  identifier: string
  nickname?: string
  display_name: string
  normalized_identifier?: string
}

export const getTowers = async (condoId?: string) => {
  const authCondoId = condoId || pb.authStore.record?.condo_id
  const isMaster = pb.authStore.record?.role === 'master' || pb.authStore.record?.role === 'admin'
  const filter = !isMaster && authCondoId ? `condo_id = "${authCondoId}"` : ''
  return pb.collection('towers').getFullList<Tower>({
    filter,
    sort: 'display_name',
    requestKey: null,
  })
}

export const createTower = async (data: {
  identifier: string
  nickname?: string
  display_name?: string
  condo_id?: string
}) => {
  const authCondoId = pb.authStore.record?.condo_id
  const payload: any = { ...data }
  if (authCondoId && !payload.condo_id) {
    payload.condo_id = authCondoId
  }
  const cleanIdent = payload.identifier.trim().replace(/\s+/g, ' ')
  const cleanNick = (payload.nickname || '').trim().replace(/\s+/g, ' ')
  payload.identifier = cleanIdent
  payload.nickname = cleanNick
  if (!payload.display_name) {
    payload.display_name = cleanNick ? `${cleanIdent} (${cleanNick})` : cleanIdent
  }
  return pb.collection('towers').create<Tower>(payload)
}

export const updateTower = async (
  id: string,
  data: {
    identifier?: string
    nickname?: string
    display_name?: string
    condo_id?: string
  },
) => {
  const payload: any = { ...data }
  if (payload.identifier !== undefined) {
    payload.identifier = payload.identifier.trim().replace(/\s+/g, ' ')
  }
  if (payload.nickname !== undefined) {
    payload.nickname = payload.nickname.trim().replace(/\s+/g, ' ')
  }
  if (payload.identifier && !payload.display_name) {
    payload.display_name = payload.nickname
      ? `${payload.identifier} (${payload.nickname})`
      : payload.identifier
  }
  return pb.collection('towers').update<Tower>(id, payload)
}

export const deleteTower = async (id: string) => {
  return pb.collection('towers').delete(id)
}
