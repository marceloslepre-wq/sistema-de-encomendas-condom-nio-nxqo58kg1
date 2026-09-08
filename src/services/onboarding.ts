import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export type PublicPlan = RecordModel & {
  nome: string
  descricao?: string
  preco_mensal?: number
  max_moradores?: number
  max_units?: number
  status: string
}

export interface OnboardingPayload {
  razaoSocial: string
  cnpj: string
  email: string
  cidade: string
  estado: string
  responsavel?: string
  phone?: string
  planoId?: string
  password?: string
}

export interface OnboardingResult {
  success: boolean
  condo: {
    id: string
    name: string
    cnpj: string
    cidade: string
    estado: string
  }
  plano: {
    id: string
    nome: string
    preco_mensal: number
  }
  licenca: {
    id: string
    status: string
    data_expiracao: string
    dias_trial: number
  }
  gestor: {
    id: string
    email: string
    role: string
  }
}

export const getPublicPlans = async (): Promise<PublicPlan[]> => {
  return await pb.collection('planos').getFullList<PublicPlan>({
    filter: 'status = "ativo"',
    sort: 'preco_mensal',
    requestKey: null,
  })
}

export const submitOnboarding = async (data: OnboardingPayload): Promise<OnboardingResult> => {
  return await pb.send('/backend/v1/public/onboarding', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
    requestKey: null,
  })
}
