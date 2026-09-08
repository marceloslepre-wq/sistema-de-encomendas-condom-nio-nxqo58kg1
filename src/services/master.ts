import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export type Plano = RecordModel & {
  nome: string
  descricao?: string
  preco_mensal?: number
  max_moradores?: number
  max_units?: number
  recursos_liberados?: Record<string, any>
  status: 'ativo' | 'inativo'
}

export type Licenca = RecordModel & {
  condo_id: string
  plano_id: string
  status: 'ativa' | 'pausada' | 'cancelada' | 'expirada'
  data_expiracao?: string
  expand?: {
    condo_id?: RecordModel & { name: string; cnpj?: string }
    plano_id?: Plano
  }
}

export const getPlanos = () =>
  pb.collection('planos').getFullList<Plano>({ sort: 'preco_mensal', requestKey: null })

export const createPlano = (data: Partial<Plano>) =>
  pb.collection('planos').create<Plano>(data, { requestKey: null })

export const updatePlano = (id: string, data: Partial<Plano>) =>
  pb.collection('planos').update<Plano>(id, data, { requestKey: null })

export const deletePlano = (id: string) => pb.collection('planos').delete(id, { requestKey: null })

export const getLicencas = () =>
  pb
    .collection('licencas')
    .getFullList<Licenca>({ expand: 'condo_id,plano_id', sort: '-created', requestKey: null })

export const createLicenca = (data: Partial<Licenca>) =>
  pb.collection('licencas').create<Licenca>(data, { requestKey: null })

export const updateLicenca = (id: string, data: Partial<Licenca>) =>
  pb.collection('licencas').update<Licenca>(id, data, { requestKey: null })

export const deleteLicenca = (id: string) =>
  pb.collection('licencas').delete(id, { requestKey: null })

export const getCondosList = () =>
  pb.collection('condos').getFullList({ sort: 'name', requestKey: null })
