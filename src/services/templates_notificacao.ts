import pb from '@/lib/pocketbase/client'

export const getTemplatesNotificacao = async () => {
  try {
    return await pb.collection('templates_notificacao').getFullList()
  } catch (e) {
    return []
  }
}

export const createTemplateNotificacao = async (data: any) => {
  return pb.collection('templates_notificacao').create(data)
}

export const updateTemplateNotificacao = async (id: string, data: any) => {
  return pb.collection('templates_notificacao').update(id, data)
}

export const deleteTemplateNotificacao = async (id: string) => {
  return pb.collection('templates_notificacao').delete(id)
}
