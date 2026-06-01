migrate(
  (app) => {
    const collection = new Collection({
      name: 'whatsapp_logs',
      type: 'base',
      listRule: "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'",
      viewRule: "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'phone', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['success', 'error'],
          maxSelect: 1,
        },
        { name: 'response', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('whatsapp_logs')
    app.delete(collection)
  },
)
