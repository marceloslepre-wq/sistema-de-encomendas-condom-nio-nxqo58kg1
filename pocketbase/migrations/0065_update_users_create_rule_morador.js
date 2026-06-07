migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.createRule =
      "(@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')) || (@request.auth.id = '' && @request.body.role = 'morador')"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.createRule =
      "(@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin'))"
    app.save(users)
  },
)
