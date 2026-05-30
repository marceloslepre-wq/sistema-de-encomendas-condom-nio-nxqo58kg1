migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.updateRule = "id = @request.auth.id || @request.auth.role = 'gestor'"
    users.deleteRule = "id = @request.auth.id || @request.auth.role = 'gestor'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)
