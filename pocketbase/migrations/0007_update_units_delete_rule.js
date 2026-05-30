migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('units')
    col.deleteRule = "@request.auth.role = 'gestor'"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('units')
    col.deleteRule = null
    app.save(col)
  },
)
