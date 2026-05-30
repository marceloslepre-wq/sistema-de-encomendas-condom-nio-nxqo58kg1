migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // admin@admin.com
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'admin@admin.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('admin@admin.com')
      record.setPassword('admin@admin')
      record.setVerified(true)
      record.set('name', 'Admin Principal')
      record.set('role', 'gestor')
      record.set('status', 'Ativo')
      app.save(record)
    }

    // marceloslepre@gmail.com
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
    } catch (_) {
      const record2 = new Record(users)
      record2.setEmail('marceloslepre@gmail.com')
      record2.setPassword('Skip@Pass')
      record2.setVerified(true)
      record2.set('name', 'Marcelo')
      record2.set('role', 'gestor')
      record2.set('status', 'Ativo')
      app.save(record2)
    }
  },
  (app) => {
    try {
      const r1 = app.findAuthRecordByEmail('_pb_users_auth_', 'admin@admin.com')
      app.delete(r1)
    } catch (_) {}
    try {
      const r2 = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
      app.delete(r2)
    } catch (_) {}
  },
)
