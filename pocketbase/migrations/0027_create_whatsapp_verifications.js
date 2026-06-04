migrate(
  (app) => {
    const collection = new Collection({
      name: 'whatsapp_verifications',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'phone', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'used', type: 'bool', required: false },
        { name: 'attempts', type: 'number', required: false },
        { name: 'expires_at', type: 'date', required: true },
        { name: 'locked_until', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_wa_verif_phone ON whatsapp_verifications (phone)'],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('whatsapp_verifications')
      app.delete(collection)
    } catch (err) {}
  },
)
