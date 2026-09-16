migrate(
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!users.fields.getByName('notificacoes_whatsapp')) {
        users.fields.add(new BoolField({ name: 'notificacoes_whatsapp' }))
        app.save(users)
      }
    } catch (e) {
      console.log('Erro ao adicionar notificacoes_whatsapp em users:', e)
    }

    try {
      const moradores = app.findCollectionByNameOrId('moradores')
      if (!moradores.fields.getByName('notificacoes_whatsapp')) {
        moradores.fields.add(new BoolField({ name: 'notificacoes_whatsapp' }))
        app.save(moradores)
      }
    } catch (e) {
      console.log('Erro ao adicionar notificacoes_whatsapp em moradores:', e)
    }

    // Inicializar todos os usuários (especialmente moradores) e registros de moradores existentes com notificacoes_whatsapp = true
    try {
      app
        .db()
        .newQuery(
          'UPDATE users SET notificacoes_whatsapp = 1 WHERE notificacoes_whatsapp IS NULL OR notificacoes_whatsapp = 0',
        )
        .execute()
    } catch (e) {
      console.log('Erro ao atualizar notificacoes_whatsapp em users:', e)
    }

    try {
      app
        .db()
        .newQuery(
          'UPDATE moradores SET notificacoes_whatsapp = 1 WHERE notificacoes_whatsapp IS NULL OR notificacoes_whatsapp = 0',
        )
        .execute()
    } catch (e) {
      console.log('Erro ao atualizar notificacoes_whatsapp em moradores:', e)
    }
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (users.fields.getByName('notificacoes_whatsapp')) {
        users.fields.removeByName('notificacoes_whatsapp')
        app.save(users)
      }
    } catch (e) {}

    try {
      const moradores = app.findCollectionByNameOrId('moradores')
      if (moradores.fields.getByName('notificacoes_whatsapp')) {
        moradores.fields.removeByName('notificacoes_whatsapp')
        app.save(moradores)
      }
    } catch (e) {}
  },
)
