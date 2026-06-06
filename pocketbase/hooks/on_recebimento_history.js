onRecordAfterCreateSuccess((e) => {
  try {
    const historicoCol = $app.findCollectionByNameOrId('historico_andamento')
    const record = new Record(historicoCol)
    record.set('recebimento_id', e.record.id)
    record.set('status', e.record.getString('status') || 'CRIADO')
    record.set('observacoes', 'Encomenda registrada no sistema')
    $app.save(record)
  } catch (err) {
    console.log('ERRO:', err.message)
  }
  return e.next()
}, 'recebimentos_auditoria')

onRecordAfterUpdateSuccess((e) => {
  try {
    const oldStatus = e.record.original().getString('status')
    const newStatus = e.record.getString('status')
    if (oldStatus !== newStatus) {
      const historicoCol = $app.findCollectionByNameOrId('historico_andamento')
      const record = new Record(historicoCol)
      record.set('recebimento_id', e.record.id)
      record.set('status', newStatus)
      record.set('observacoes', 'Status atualizado para ' + newStatus)
      $app.save(record)
    }
  } catch (err) {
    console.log('ERRO:', err.message)
  }
  return e.next()
}, 'recebimentos_auditoria')
