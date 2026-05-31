migrate((app) => {
  const volumeTypes = new Collection({
    name: 'volume_types',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'gestor'",
    updateRule: "@request.auth.role = 'gestor'",
    deleteRule: "@request.auth.role = 'gestor'",
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
  })
  app.save(volumeTypes)

  const shelfLocations = new Collection({
    name: 'shelf_locations',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'gestor'",
    updateRule: "@request.auth.role = 'gestor'",
    deleteRule: "@request.auth.role = 'gestor'",
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
  })
  app.save(shelfLocations)

  const notificationTemplates = new Collection({
    name: 'notification_templates',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'gestor'",
    updateRule: "@request.auth.role = 'gestor'",
    deleteRule: "@request.auth.role = 'gestor'",
    fields: [
      {
        name: 'status',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['ENTRADA_PORTARIA', 'EM_TRIAGEM', 'LIBERADO_RETIRADA', 'RETIRADO', 'CANCELADO'],
      },
      { name: 'message', type: 'text', required: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_nt_status ON notification_templates (status)'],
  })
  app.save(notificationTemplates)

  const parcels = app.findCollectionByNameOrId('parcels')
  parcels.fields.removeByName('volume_type')
  parcels.fields.add(new TextField({ name: 'volume_type', required: false }))
  app.save(parcels)
})
