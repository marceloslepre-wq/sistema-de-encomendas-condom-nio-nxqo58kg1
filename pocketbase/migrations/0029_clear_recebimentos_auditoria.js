migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    app.truncateCollection(col)
  },
  (app) => {
    // Data cannot be restored
  },
)
