// pocketbase/hooks/on_record_condo_assign.js
// Garante o preenchimento automático do condo_id em todas as criações de registros
// baseadas no usuário autenticado (ou condo_id enviado pelo gestor/master).

const collectionsWithCondo = [
  'recebimentos_auditoria',
  'units',
  'moradores',
  'carriers',
  'templates_notificacao',
  'notificacoes_enviadas',
  'volume_types',
  'shelf_locations',
  'historico_andamento',
  'whatsapp_verifications',
  'whatsapp_logs',
  'invitation_links',
  'entregadores',
  'users',
]

for (const colName of collectionsWithCondo) {
  onRecordCreate((e) => {
    const record = e.record
    const existingCondoId = record.getString('condo_id')

    // Se já tiver condo_id definido (por exemplo, definido explicitamente), respeita
    if (existingCondoId) {
      return e.next()
    }

    const auth = e.requestInfo().auth
    if (auth) {
      const authCondoId = auth.getString('condo_id')
      if (authCondoId) {
        record.set('condo_id', authCondoId)
        return e.next()
      }
    }

    // Se for recebimento ou unidade, tentar inferir da unidade relacionada se for o caso
    if (colName === 'recebimentos_auditoria') {
      const unidadeId = record.getString('unidade_id')
      if (unidadeId) {
        try {
          const unit = $app.findRecordById('units', unidadeId)
          const cId = unit.getString('condo_id')
          if (cId) {
            record.set('condo_id', cId)
            return e.next()
          }
        } catch (_) {}
      }
    }

    // Fallback: se nenhum condomínio foi associado, buscar o condomínio padrão do sistema
    try {
      const defaultCondo = $app.findFirstRecordByData(
        'condos',
        'name',
        'Condomínio Residencial Parque',
      )
      if (defaultCondo && record.getString('role') !== 'master') {
        record.set('condo_id', defaultCondo.id)
      }
    } catch (_) {}

    return e.next()
  }, colName)
}
