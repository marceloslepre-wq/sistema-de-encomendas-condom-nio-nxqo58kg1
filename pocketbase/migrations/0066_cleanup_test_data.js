migrate(
  (app) => {
    // Delete all residents except the primary reference account
    app
      .db()
      .newQuery(`
    DELETE FROM moradores 
    WHERE email != 'marcelolepre@hotmail.com'
  `)
      .execute()

    // Delete all users except the primary reference account and administrative roles
    app
      .db()
      .newQuery(`
    DELETE FROM users 
    WHERE email != 'marcelolepre@hotmail.com' 
    AND role NOT IN ('admin', 'gestor')
  `)
      .execute()
  },
  (app) => {
    // No rollback for mass deletion
  },
)
