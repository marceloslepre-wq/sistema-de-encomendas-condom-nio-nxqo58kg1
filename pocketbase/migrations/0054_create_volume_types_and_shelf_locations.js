migrate(
  (app) => {
    const volumeTypes = new Collection({
      name: 'volume_types',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
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
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(shelfLocations)
  },
  (app) => {
    try {
      const volumeTypes = app.findCollectionByNameOrId('volume_types')
      app.delete(volumeTypes)
    } catch (_) {}

    try {
      const shelfLocations = app.findCollectionByNameOrId('shelf_locations')
      app.delete(shelfLocations)
    } catch (_) {}
  },
)
