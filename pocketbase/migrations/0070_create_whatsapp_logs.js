migrate(
  (app) => {
    let collection
    try {
      collection = app.findCollectionByNameOrId('whatsapp_logs')
    } catch (_) {
      collection = new Collection({
        name: 'whatsapp_logs',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'phone', type: 'text' },
          { name: 'message', type: 'text' },
          { name: 'status_code', type: 'number' },
          { name: 'response_body', type: 'json' },
          { name: 'success', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
      return
    }

    // Se já existir, garantimos que possui os campos corretos e as regras.
    if (!collection.fields.getByName('phone'))
      collection.fields.add(new TextField({ name: 'phone' }))
    if (!collection.fields.getByName('message'))
      collection.fields.add(new TextField({ name: 'message' }))
    if (!collection.fields.getByName('status_code'))
      collection.fields.add(new NumberField({ name: 'status_code' }))
    if (!collection.fields.getByName('response_body'))
      collection.fields.add(new JSONField({ name: 'response_body' }))
    if (!collection.fields.getByName('success'))
      collection.fields.add(new BoolField({ name: 'success' }))

    collection.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
    collection.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('whatsapp_logs')
      app.delete(col)
    } catch (_) {}
  },
)
