import pb from '@/lib/pocketbase/client'

export interface LicencaStatusResponse {
  bloqueado: boolean
  status: string
  data_expiracao: string | null
  dias_restantes: number | null
  licenca_id?: string
  condo_id?: string
  condo_name?: string
  plano?: {
    id: string
    nome: string
    preco_mensal: number
    descricao?: string
  }
  role?: string
  master?: boolean
  sem_condo?: boolean
  observacao?: string
}

export interface IniciarRenovacaoResponse {
  configured: boolean
  message?: string
  preference_id?: string
  init_point?: string
  sandbox_init_point?: string
  valor?: number
  plano_nome?: string
}

export const getLicencaStatus = async (): Promise<LicencaStatusResponse> => {
  return await pb.send('/backend/v1/licenca/status', {
    method: 'GET',
    requestKey: null,
  })
}

export const iniciarRenovacao = async (): Promise<IniciarRenovacaoResponse> => {
  return await pb.send('/backend/v1/pagamento/renovar', {
    method: 'POST',
    requestKey: null,
  })
}
