migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'porteiro@email.com')
      if (user) {
        user.set('role', 'porteiro')
        app.save(user)
      }
    } catch (_) {
      // Se não existir, tenta encontrar na collection 'users'
      try {
        const user = app.findAuthRecordByEmail('users', 'porteiro@email.com')
        if (user) {
          user.set('role', 'porteiro')
          app.save(user)
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'porteiro@email.com')
      if (user) {
        user.set('role', 'portaria')
        app.save(user)
      }
    } catch (_) {}
  },
)
