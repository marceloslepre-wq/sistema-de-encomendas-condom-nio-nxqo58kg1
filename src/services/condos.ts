import pb from '@/lib/pocketbase/client'

export interface CondoRecord {
  id: string
  name: string
  cnpj?: string
  email?: string
  cidade?: string
  estado?: string
  responsavel?: string
  phone?: string
  address?: string
  logo?: string
  janitor_settings?: any
  whatsapp_instance_name?: string
  whatsapp_connected?: boolean
  whatsapp_phone?: string
  whatsapp_status?: 'disconnected' | 'connecting' | 'connected' | string
  whatsapp_qrcode?: string
  whatsapp_updated_at?: string
  created?: string
  updated?: string
}

export interface WhatsAppConnectResponse {
  success: boolean
  instanceName: string
  status: string
  qrcode?: string
}

export interface WhatsAppStatusResponse {
  instanceName: string
  status: 'disconnected' | 'connecting' | 'connected' | string
  connected: boolean
  phone?: string
  qrcode?: string
  evolutionConfigured?: boolean
  evolutionState?: string
}

export const conectarWhatsAppCondo = async (condoId?: string): Promise<WhatsAppConnectResponse> => {
  return (await pb.send('/backend/v1/whatsapp/conectar', {
    method: 'POST',
    body: condoId ? { condo_id: condoId } : {},
  })) as WhatsAppConnectResponse
}

export const consultarWhatsAppStatus = async (
  condoId?: string,
): Promise<WhatsAppStatusResponse> => {
  const query = condoId ? `?condo_id=${encodeURIComponent(condoId)}` : ''
  return (await pb.send(`/backend/v1/whatsapp/status${query}`, {
    method: 'GET',
  })) as WhatsAppStatusResponse
}

export const desconectarWhatsAppCondo = async (
  condoId?: string,
): Promise<WhatsAppStatusResponse> => {
  return (await pb.send('/backend/v1/whatsapp/desconectar', {
    method: 'POST',
    body: condoId ? { condo_id: condoId } : {},
  })) as WhatsAppStatusResponse
}

export const getCondo = async (): Promise<CondoRecord | null> => {
  try {
    const authCondoId = pb.authStore.record?.condo_id
    if (authCondoId) {
      try {
        return (await pb.collection('condos').getOne(authCondoId)) as unknown as CondoRecord
      } catch {
        // fallback to list
      }
    }
    const records = await pb.collection('condos').getFullList()
    return (records[0] as unknown as CondoRecord) || null
  } catch (e) {
    return null
  }
}

export const updateCondo = async (id: string, data: any) => {
  return pb.collection('condos').update(id, data)
}
