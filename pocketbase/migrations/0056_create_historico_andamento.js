migrate(
  (app) => {
    const recebimentos = app.findCollectionByNameOrId('recebimentos_auditoria')
    const collection = new Collection({
      name: 'historico_andamento',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'recebimento_id',
          type: 'relation',
          required: true,
          collectionId: recebimentos.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'status', type: 'text', required: true },
        { name: 'observacoes', type: 'text' },
        { name: 'data_atualizacao', type: 'autodate', onCreate: true, onUpdate: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('historico_andamento')
      app.delete(collection)
    } catch (_) {}
  },
)
