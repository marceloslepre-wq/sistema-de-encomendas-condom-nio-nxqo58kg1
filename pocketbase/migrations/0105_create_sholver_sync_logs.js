migrate(
  (app) => {
    const collection = new Collection({
      name: 'sholver_sync_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'master'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'master'",
      createRule: null, // pb_hooks / backend only
      updateRule: null,
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'master'",
      fields: [
        { name: 'numero_pedido', type: 'text' },
        {
          name: 'condo_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('condos').id,
          maxSelect: 1,
        },
        {
          name: 'licenca_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('licencas').id,
          maxSelect: 1,
        },
        {
          name: 'plano_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('planos').id,
          maxSelect: 1,
        },
        { name: 'evento', type: 'text' },
        { name: 'status_pedido', type: 'text' },
        { name: 'metodo_pagamento', type: 'text' },
        { name: 'valor', type: 'number' },
        { name: 'http_status', type: 'number' },
        { name: 'sucesso', type: 'bool' },
        { name: 'request_payload', type: 'json' },
        { name: 'response_body', type: 'json' },
        { name: 'error', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sholver_logs_pedido ON sholver_sync_logs (numero_pedido)',
        'CREATE INDEX idx_sholver_logs_condo ON sholver_sync_logs (condo_id)',
        'CREATE INDEX idx_sholver_logs_created ON sholver_sync_logs (created DESC)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('sholver_sync_logs')
      app.delete(col)
    } catch (_) {}
  },
)
