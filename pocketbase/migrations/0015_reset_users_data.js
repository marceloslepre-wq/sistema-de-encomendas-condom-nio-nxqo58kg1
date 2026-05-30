migrate(
  (app) => {
    // Find all existing users
    const users = app.findRecordsByFilter('users', "id != ''", '', 10000, 0)

    // Delete all existing users to clean up unique indexes (cpf, email)
    for (let i = 0; i < users.length; i++) {
      try {
        app.delete(users[i])
      } catch (_) {
        // Fallback: if app.delete fails due to some foreign key relation that
        // is not set to cascade, force delete via raw SQL.
        try {
          app
            .db()
            .newQuery('DELETE FROM _pb_users_auth_ WHERE id = {:id}')
            .bind({ id: users[i].id })
            .execute()
        } catch (__) {}
      }
    }

    // Create the single admin user
    const collection = app.findCollectionByNameOrId('users')

    try {
      // Just in case it already exists somehow after deletion (unlikely)
      app.findAuthRecordByEmail('users', 'admin@admin.com')
    } catch (_) {
      const admin = new Record(collection)
      admin.setEmail('admin@admin.com')
      admin.setPassword('admin@admin')
      admin.setVerified(true)
      admin.set('name', 'Administrador Geral')
      admin.set('role', 'gestor')
      admin.set('status', 'Ativo')

      app.save(admin)
    }
  },
  (app) => {
    // Remove the created admin user on rollback
    try {
      const admin = app.findAuthRecordByEmail('users', 'admin@admin.com')
      app.delete(admin)
    } catch (_) {}
  },
)
