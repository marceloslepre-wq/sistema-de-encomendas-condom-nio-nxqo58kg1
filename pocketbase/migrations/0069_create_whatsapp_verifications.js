migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('whatsapp_verifications')
      const col = app.findCollectionByNameOrId('whatsapp_verifications')
      let changed = false
      if (!col.fields.getByName('verified')) {
        col.fields.add(new BoolField({ name: 'verified' }))
        changed = true
      }
      if (!col.fields.getByName('expires')) {
        col.fields.add(new DateField({ name: 'expires' }))
        changed = true
      }
      if (!col.fields.getByName('attempts')) {
        col.fields.add(new NumberField({ name: 'attempts' }))
        changed = true
      }
      if (changed) app.save(col)
    } catch (_) {
      const collection = new Collection({
        name: 'whatsapp_verifications',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
        fields: [
          { name: 'phone', type: 'text', required: true },
          { name: 'code', type: 'text', required: true },
          { name: 'verified', type: 'bool', required: false },
          { name: 'expires', type: 'date', required: false },
          { name: 'attempts', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('whatsapp_verifications')
      app.delete(collection)
    } catch (_) {}
  },
)
