migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('templates_notificacao')

    if (!col.fields.getByName('ativo')) {
      col.fields.add(new BoolField({ name: 'ativo' }))
      app.save(col)
    }

    // Garantir que todos os templates existentes estejam com ativo = true
    app
      .db()
      .newQuery('UPDATE templates_notificacao SET ativo = 1 WHERE ativo IS NULL OR ativo = 0')
      .execute()
  },
  (app) => {
    // Reversão não é necessária
  },
)
