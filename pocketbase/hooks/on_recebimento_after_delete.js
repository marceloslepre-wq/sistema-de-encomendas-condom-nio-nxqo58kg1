onRecordAfterDeleteSuccess((e) => {
  try {
    const recebimentoId = e.record.id
    try {
      const historicos = $app.findRecordsByFilter(
        'historico_andamento',
        `recebimento_id='${recebimentoId}'`,
        '',
        1000,
        0,
      )
      for (const hist of historicos) {
        try {
          $app.delete(hist)
        } catch (_) {}
      }
    } catch (_) {}
  } catch (err) {
    console.log('Error in on_recebimento_after_delete hook:', err)
  }
  return e.next()
}, 'recebimentos_auditoria')
