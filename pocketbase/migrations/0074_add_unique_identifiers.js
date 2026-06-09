migrate(
  (app) => {
    // Dedup users
    app
      .db()
      .newQuery(`
    DELETE FROM users WHERE id NOT IN (
      SELECT MIN(id) FROM users GROUP BY cpf
    ) AND cpf != '' AND cpf IS NOT NULL
  `)
      .execute()
    app
      .db()
      .newQuery(`
    DELETE FROM users WHERE id NOT IN (
      SELECT MIN(id) FROM users GROUP BY phone
    ) AND phone != '' AND phone IS NOT NULL
  `)
      .execute()

    // Add indexes to users
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.addIndex('idx_users_cpf', true, 'cpf', "cpf != ''")
    users.addIndex('idx_users_phone', true, 'phone', "phone != ''")
    app.save(users)

    // Dedup moradores
    app
      .db()
      .newQuery(`
    DELETE FROM moradores WHERE id NOT IN (
      SELECT MIN(id) FROM moradores GROUP BY cpf
    ) AND cpf != '' AND cpf IS NOT NULL
  `)
      .execute()
    app
      .db()
      .newQuery(`
    DELETE FROM moradores WHERE id NOT IN (
      SELECT MIN(id) FROM moradores GROUP BY telefone
    ) AND telefone != '' AND telefone IS NOT NULL
  `)
      .execute()

    // Add indexes to moradores
    const moradores = app.findCollectionByNameOrId('moradores')
    moradores.addIndex('idx_moradores_cpf', true, 'cpf', "cpf != ''")
    moradores.addIndex('idx_moradores_telefone', true, 'telefone', "telefone != ''")
    app.save(moradores)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.removeIndex('idx_users_cpf')
    users.removeIndex('idx_users_phone')
    app.save(users)

    const moradores = app.findCollectionByNameOrId('moradores')
    moradores.removeIndex('idx_moradores_cpf')
    moradores.removeIndex('idx_moradores_telefone')
    app.save(moradores)
  },
)
