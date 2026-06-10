migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('templates_notificacao')
    const field = collection.fields.getByName('flow_stage')

    const records = app.findRecordsByFilter('templates_notificacao', '1=1', '', 100, 0)
    for (const record of records) {
      const current = record.getString('flow_stage')
      if (current === 'ENTRADA_PORTARIA') record.set('flow_stage', 'Entrada na portaria')
      else if (current === 'EM_TRIAGEM' || current === 'SALA_ENCOMENDA')
        record.set('flow_stage', 'Em triagem na sala de encomendas')
      else if (current === 'LIBERADO_RETIRADA')
        record.set('flow_stage', 'Processado e Liberado para Retirada')
      else if (current === 'RETIRADO' || current === 'ENTREGUE')
        record.set('flow_stage', 'Encomenda Retirada')
      app.saveNoValidate(record)
    }

    field.values = [
      'Entrada na portaria',
      'Em triagem na sala de encomendas',
      'Processado e Liberado para Retirada',
      'Encomenda Retirada',
    ]

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('templates_notificacao')
    const field = collection.fields.getByName('flow_stage')
    field.values = [
      'ENTRADA_PORTARIA',
      'EM_TRIAGEM',
      'SALA_ENCOMENDA',
      'LIBERADO_RETIRADA',
      'RETIRADO',
      'CANCELADO',
      'LEMBRETE',
      'Entrada na portaria',
      'Em triagem na sala de encomendas',
      'Processado e Liberado para Retirada',
      'Encomenda Retirada',
    ]
    app.save(collection)
  },
)
