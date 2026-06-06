migrate(
  (app) => {
    const volumeTypes = app.findCollectionByNameOrId('volume_types')
    const shelfLocations = app.findCollectionByNameOrId('shelf_locations')

    const vTypes = ['Caixa P', 'Caixa M', 'Caixa G', 'Envelope', 'Saco Plástico']
    for (const name of vTypes) {
      try {
        app.findFirstRecordByData('volume_types', 'name', name)
      } catch (_) {
        const record = new Record(volumeTypes)
        record.set('name', name)
        app.save(record)
      }
    }

    const sLocs = ['Prateleira A', 'Prateleira B', 'Prateleira C', 'Chão', 'Refrigerador']
    for (const name of sLocs) {
      try {
        app.findFirstRecordByData('shelf_locations', 'name', name)
      } catch (_) {
        const record = new Record(shelfLocations)
        record.set('name', name)
        app.save(record)
      }
    }
  },
  (app) => {
    // down migration: do nothing to keep data safe
  },
)
