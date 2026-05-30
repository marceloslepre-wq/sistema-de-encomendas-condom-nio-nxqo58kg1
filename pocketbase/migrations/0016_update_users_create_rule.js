migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.createRule = ''
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.createRule = "@request.auth.role = 'gestor'"
    app.save(col)
  },
)
