migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'porteiro@email.com')
      return // already seeded
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('porteiro@email.com')
    record.setPassword('senha123')
    record.setVerified(true)
    record.set('name', 'Porteiro de Teste')
    record.set('role', 'portaria')

    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'porteiro@email.com')
      app.delete(record)
    } catch (_) {}
  },
)
