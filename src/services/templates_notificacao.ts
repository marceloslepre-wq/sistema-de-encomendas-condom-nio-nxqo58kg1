import pb from '@/lib/pocketbase/client'

export const getTemplatesNotificacao = async () => {
  try {
    const authCondoId = pb.authStore.record?.condo_id
    const isMaster = pb.authStore.record?.role === 'master' || pb.authStore.record?.role === 'admin'
    const filter = !isMaster && authCondoId ? `condo_id = "${authCondoId}"` : ''
    return await pb.collection('templates_notificacao').getFullList({ filter })
  } catch (e) {
    return []
  }
}

export const createTemplateNotificacao = async (data: any) => {
  const authCondoId = pb.authStore.record?.condo_id
  const payload: any = { ...data }
  if (authCondoId && !payload.condo_id) payload.condo_id = authCondoId
  return pb.collection('templates_notificacao').create(payload)
}

export const updateTemplateNotificacao = async (id: string, data: any) => {
  return pb.collection('templates_notificacao').update(id, data)
}

export const deleteTemplateNotificacao = async (id: string) => {
  return pb.collection('templates_notificacao').delete(id)
}
