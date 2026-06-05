migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    app
      .db()
      .newQuery(
        `DELETE FROM users WHERE email IN ('gestor@email.com', 'porteiro@email.com', 'morador@email.com')`,
      )
      .execute()

    const usersData = [
      { email: 'gestor@email.com', name: 'Gestor Teste', role: 'gestor' },
      { email: 'porteiro@email.com', name: 'Porteiro Teste', role: 'portaria' },
      { email: 'morador@email.com', name: 'Morador Teste', role: 'morador' },
    ]

    for (const data of usersData) {
      const record = new Record(usersCol)
      record.setEmail(data.email)
      record.setPassword('senha123')
      record.setVerified(true)
      record.set('name', data.name)
      record.set('role', data.role)
      app.save(record)
    }
  },
  (app) => {
    app
      .db()
      .newQuery(
        `DELETE FROM users WHERE email IN ('gestor@email.com', 'porteiro@email.com', 'morador@email.com')`,
      )
      .execute()
  },
)
