import pb from '@/lib/pocketbase/client'

export interface LicencaStatusResponse {
  bloqueado: boolean
  status: string
  data_expiracao?: string | null
  dias_restantes?: number | null
  sem_expiracao?: boolean
  licenca_id?: string
  condo_id?: string
  condo_name?: string
  override_max_usuarios?: number | null
  override_max_unidades?: number | null
  plano?: {
    id: string
    nome: string
    preco_mensal: number
    descricao: string
    exclusivo_master?: boolean
    max_moradores?: number
    max_units?: number
    base_max_moradores?: number
    base_max_units?: number
    recursos_liberados?: any
  } | null
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

export interface CriarPixResponse {
  configured: boolean
  message?: string
  payment_id?: string
  status?: string
  status_detail?: string
  qr_code?: string
  qr_code_base64?: string
  ticket_url?: string
  date_of_expiration?: string
  valor?: number
  plano_nome?: string
  condo_name?: string
  licenca_id?: string
}

export interface PixStatusResponse {
  payment_id: string
  status: string // 'pending', 'approved', 'rejected', 'cancelled', etc.
  status_detail?: string
  licenca_id?: string
  data_expiracao?: string | null
  renovado?: boolean
  error?: string
}

const getAuthHeaders = () => {
  const token = pb.authStore.token
  return token ? { Authorization: token } : {}
}

export const getLicencaStatus = async (): Promise<LicencaStatusResponse> => {
  return await pb.send('/backend/v1/licenca/status', {
    method: 'GET',
    requestKey: null,
    headers: getAuthHeaders(),
  })
}

export const iniciarRenovacao = async (): Promise<IniciarRenovacaoResponse> => {
  return await pb.send('/backend/v1/pagamento/renovar', {
    method: 'POST',
    requestKey: null,
    headers: getAuthHeaders(),
  })
}

export const criarPixRenovacao = async (): Promise<CriarPixResponse> => {
  return await pb.send('/backend/v1/pagamento/pix/criar', {
    method: 'POST',
    requestKey: null,
    headers: getAuthHeaders(),
  })
}

export const consultarPixStatus = async (paymentId: string): Promise<PixStatusResponse> => {
  return await pb.send(`/backend/v1/pagamento/pix/status/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    requestKey: null,
    headers: getAuthHeaders(),
  })
}
