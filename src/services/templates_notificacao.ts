import pb from '@/lib/pocketbase/client'
import { getActiveCondoId, isSupportModeActive } from './supportSession'

export const getTemplatesNotificacao = async () => {
  try {
    const activeCondoId = getActiveCondoId()
    const isMaster = pb.authStore.record?.role === 'master' || pb.authStore.record?.role === 'admin'
    const inSupport = isSupportModeActive()
    const filter = (!isMaster || inSupport) && activeCondoId ? `condo_id = "${activeCondoId}"` : ''
    return await pb.collection('templates_notificacao').getFullList({ filter })
  } catch (e) {
    return []
  }
}

export const createTemplateNotificacao = async (data: any) => {
  const activeCondoId = getActiveCondoId()
  const payload: any = { ...data }
  if (activeCondoId && !payload.condo_id) payload.condo_id = activeCondoId
  return pb.collection('templates_notificacao').create(payload)
}

export const updateTemplateNotificacao = async (id: string, data: any) => {
  return pb.collection('templates_notificacao').update(id, data)
}

export const deleteTemplateNotificacao = async (id: string) => {
  return pb.collection('templates_notificacao').delete(id)
}
