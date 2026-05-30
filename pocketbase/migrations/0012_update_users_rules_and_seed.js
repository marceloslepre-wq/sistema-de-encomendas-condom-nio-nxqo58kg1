migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.listRule =
      "id = @request.auth.id || @request.auth.role = 'portaria' || @request.auth.role = 'gestor' || @request.auth.role = 'triagem'"
    users.viewRule =
      "id = @request.auth.id || @request.auth.role = 'portaria' || @request.auth.role = 'gestor' || @request.auth.role = 'triagem'"
    users.createRule = "@request.auth.role = 'gestor'"
    users.updateRule = "id = @request.auth.id || @request.auth.role = 'gestor'"
    users.deleteRule = "id = @request.auth.id || @request.auth.role = 'gestor'"
    app.save(users)

    try {
      app.findAuthRecordByEmail('users', 'marceloslepre@gmail.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('marceloslepre@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Gestor Admin')
      record.set('role', 'gestor')
      record.set('status', 'Ativo')
      app.save(record)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.listRule =
      "id = @request.auth.id || @request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    users.viewRule =
      "id = @request.auth.id || @request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    users.createRule = ''
    app.save(users)
  },
)
