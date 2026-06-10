migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('templates_notificacao')
    const field = col.fields.getByName('flow_stage')
    if (field) {
      field.values = [
        ...field.values,
        'Entrada na portaria',
        'Em triagem na sala de encomendas',
        'Processado e Liberado para Retirada',
        'Encomenda Retirada',
      ]
      app.save(col)
    }

    const templates = app.findRecordsByFilter('templates_notificacao', '1=1', '', 1000, 0)
    for (const t of templates) {
      const stage = t.getString('flow_stage') || t.getString('status')
      let newStage = stage
      if (stage === 'ENTRADA_PORTARIA') newStage = 'Entrada na portaria'
      if (stage === 'EM_TRIAGEM' || stage === 'SALA_ENCOMENDA')
        newStage = 'Em triagem na sala de encomendas'
      if (stage === 'LIBERADO_RETIRADA') newStage = 'Processado e Liberado para Retirada'
      if (stage === 'RETIRADO' || stage === 'ENTREGUE') newStage = 'Encomenda Retirada'
      t.set('flow_stage', newStage)
      t.set('status', newStage)
      app.save(t)
    }
  },
  (app) => {
    // down migration
  },
)
