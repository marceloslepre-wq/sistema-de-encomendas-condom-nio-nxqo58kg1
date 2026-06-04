migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    col.fields.add(new JSONField({ name: 'volume_statuses' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    col.fields.removeByName('volume_statuses')
    app.save(col)
  },
)
