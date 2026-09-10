import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export type Plano = RecordModel & {
  nome: string
  descricao?: string
  preco_mensal?: number
  max_moradores?: number
  max_units?: number
  exclusivo_master?: boolean
  recursos_liberados?: Record<string, any>
  status: 'ativo' | 'inativo'
}

export type Licenca = RecordModel & {
  condo_id: string
  plano_id: string
  status: 'ativa' | 'pausada' | 'cancelada' | 'expirada' | 'renovada' | 'Renovada'
  data_expiracao?: string
  override_max_usuarios?: number | null
  override_max_unidades?: number | null
  expand?: {
    condo_id?: RecordModel & { name: string; cnpj?: string; address?: string }
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

export const reativarLicenca30Dias = async (id: string, currentExpDate?: string) => {
  // Buscar licença existente para copiar condo_id, plano_id e overrides
  const licencaAtual = await pb.collection('licencas').getOne<Licenca>(id, { requestKey: null })

  const now = new Date()
  let baseDate = now
  const expDateStr = currentExpDate || licencaAtual.data_expiracao
  if (expDateStr) {
    const cur = new Date(expDateStr)
    if (cur.getTime() > now.getTime()) {
      baseDate = cur
    }
  }
  const novaExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  // 1. Criar a nova licença ativa
  const novaLicenca = await pb.collection('licencas').create<Licenca>(
    {
      condo_id: licencaAtual.condo_id,
      plano_id: licencaAtual.plano_id,
      status: 'ativa',
      data_expiracao: novaExp.toISOString(),
      override_max_usuarios: licencaAtual.override_max_usuarios || 0,
      override_max_unidades: licencaAtual.override_max_unidades || 0,
    },
    { requestKey: null },
  )

  // 2. Marcar a licença anterior (e quaisquer outras ativas deste condomínio) como 'renovada'
  try {
    const anteriores = await pb.collection('licencas').getFullList<Licenca>({
      filter: `condo_id = "${licencaAtual.condo_id}" && id != "${novaLicenca.id}" && (status = "ativa" || status = "ativo")`,
      requestKey: null,
    })
    for (const ant of anteriores) {
      await pb.collection('licencas').update(ant.id, { status: 'renovada' }, { requestKey: null })
    }
  } catch (_) {
    // Fallback garantido para a licença clicada
    try {
      await pb.collection('licencas').update(id, { status: 'renovada' }, { requestKey: null })
    } catch {
      /* intentionally ignored */
    }
  }

  // 3. Registrar no histórico de licenças
  try {
    let planoNome = 'Plano'
    if (licencaAtual.plano_id) {
      try {
        const plano = await pb
          .collection('planos')
          .getOne<Plano>(licencaAtual.plano_id, { requestKey: null })
        planoNome = plano.nome || planoNome
      } catch {
        /* intentionally ignored */
      }
    }

    await pb.collection('historico_licencas').create(
      {
        condo_id: licencaAtual.condo_id,
        licenca_id: novaLicenca.id,
        plano_id: licencaAtual.plano_id,
        tipo_evento: 'reativacao_30d',
        plano_nome: planoNome,
        data_expiracao: novaExp.toISOString(),
        descricao: `Reativação +30 dias pelo painel master. Nova licença ${novaLicenca.id} criada; licença anterior ${id} marcada como renovada.`,
        alterado_por: 'Administrador Master',
      },
      { requestKey: null },
    )
  } catch {
    /* intentionally ignored */
  }

  return novaLicenca
}

export const deleteLicenca = (id: string) =>
  pb.collection('licencas').delete(id, { requestKey: null })

export const getCondosList = () =>
  pb.collection('condos').getFullList({ sort: 'name', requestKey: null })

export type HistoricoLicenca = RecordModel & {
  condo_id: string
  licenca_id?: string
  plano_id?: string
  tipo_evento: string
  plano_nome?: string
  data_expiracao?: string
  descricao?: string
  alterado_por?: string
  created: string
}

export const getPlanosDisponiveisCliente = () =>
  pb.collection('planos').getFullList<Plano>({
    filter: 'status = "ativo" && (exclusivo_master = false || exclusivo_master = null)',
    sort: 'preco_mensal',
    requestKey: null,
  })

export const getHistoricoLicencas = (condoId?: string) => {
  const filter = condoId ? `condo_id = "${condoId}"` : ''
  return pb.collection('historico_licencas').getFullList<HistoricoLicenca>({
    filter,
    sort: '-created',
    requestKey: null,
  })
}

export const trocarPlanoGestor = async (planoId: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (pb.authStore.token) {
    headers['Authorization'] = pb.authStore.token
  }
  return await pb.send('/backend/v1/licenca/trocar-plano', {
    method: 'POST',
    body: JSON.stringify({ plano_id: planoId }),
    headers,
    requestKey: null,
  })
}
