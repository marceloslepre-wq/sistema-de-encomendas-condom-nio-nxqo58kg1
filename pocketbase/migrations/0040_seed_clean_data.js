migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const seedUsers = [
      { email: 'porteiro@email.com', role: 'porteiro' },
      { email: 'triagem@email.com', role: 'triagem' },
      { email: 'gestor@email.com', role: 'gestor' },
    ]

    for (const su of seedUsers) {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', su.email)
      } catch (_) {
        const record = new Record(users)
        record.setEmail(su.email)
        record.setPassword('senha123')
        record.setVerified(true)
        record.set('role', su.role)
        record.set('name', su.role.charAt(0).toUpperCase() + su.role.slice(1))
        app.save(record)
      }
    }

    const templates = app.findCollectionByNameOrId('templates_notificacao')
    const seedTemplates = [
      { status: 'Recebido', mensagem_template: 'Sua encomenda foi recebida.', ativo: true },
      { status: 'Em Triagem', mensagem_template: 'Sua encomenda está em triagem.', ativo: true },
      {
        status: 'Liberado',
        mensagem_template: 'Sua encomenda está liberada para retirada.',
        ativo: true,
      },
    ]

    for (const st of seedTemplates) {
      try {
        app.findFirstRecordByData('templates_notificacao', 'status', st.status)
      } catch (_) {
        const record = new Record(templates)
        record.set('status', st.status)
        record.set('mensagem_template', st.mensagem_template)
        record.set('ativo', st.ativo)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const seedEmails = ['porteiro@email.com', 'triagem@email.com', 'gestor@email.com']
      for (const email of seedEmails) {
        try {
          const record = app.findAuthRecordByEmail('_pb_users_auth_', email)
          app.delete(record)
        } catch (_) {}
      }
    } catch (_) {}
  },
)
