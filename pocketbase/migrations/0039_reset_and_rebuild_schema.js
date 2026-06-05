migrate(
  (app) => {
    const collectionsToDrop = [
      'audit_logs',
      'parcels',
      'recebimentos_auditoria',
      'invitation_links',
      'units',
      'condos',
      'carriers',
      'volume_types',
      'shelf_locations',
      'whatsapp_logs',
      'whatsapp_verifications',
      'templates_notificacao',
      'notificacoes_enviadas',
    ]

    for (const name of collectionsToDrop) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (err) {
        // Ignorar caso a coleção já não exista
      }
    }

    // Atualizar a coleção users
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    app.truncateCollection(users)

    try {
      users.removeIndex('idx_users_cpf')
    } catch (e) {}
    try {
      users.removeIndex('idx_users_phone')
    } catch (e) {}

    const fieldsToRemove = [
      'avatar',
      'cpf',
      'phone',
      'role',
      'status',
      'unit_id',
      'autoriza_retirada_terceiros',
      'name',
      'codigo_liberacao',
    ]
    for (const f of fieldsToRemove) {
      const field = users.fields.getByName(f)
      if (field) {
        users.fields.removeByName(f)
      }
    }

    users.fields.add(
      new SelectField({ name: 'role', values: ['porteiro', 'triagem', 'gestor'], maxSelect: 1 }),
    )
    users.fields.add(new TextField({ name: 'name' }))
    users.fields.add(new TextField({ name: 'phone' }))

    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.updateRule = "id = @request.auth.id || @request.auth.role = 'gestor'"
    users.deleteRule = "id = @request.auth.id || @request.auth.role = 'gestor'"

    app.save(users)

    // Criar recebimentos_auditoria
    const recebimentos = new Collection({
      name: 'recebimentos_auditoria',
      type: 'base',
      listRule:
        "@request.auth.role = 'porteiro' || @request.auth.role = 'triagem' || @request.auth.role = 'gestor'",
      viewRule:
        "@request.auth.role = 'porteiro' || @request.auth.role = 'triagem' || @request.auth.role = 'gestor'",
      createRule:
        "@request.auth.role = 'porteiro' || @request.auth.role = 'triagem' || @request.auth.role = 'gestor'",
      updateRule:
        "@request.auth.role = 'porteiro' || @request.auth.role = 'triagem' || @request.auth.role = 'gestor'",
      deleteRule: null,
      fields: [
        { name: 'unidade', type: 'text' },
        { name: 'morador', type: 'text' },
        { name: 'volume', type: 'text' },
        { name: 'transportadora', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'data_criacao', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(recebimentos)

    // Criar templates_notificacao
    const templates = new Collection({
      name: 'templates_notificacao',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'gestor'",
      updateRule: "@request.auth.role = 'gestor'",
      deleteRule: "@request.auth.role = 'gestor'",
      fields: [
        { name: 'status', type: 'text' },
        { name: 'mensagem_template', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(templates)

    // Criar notificacoes_enviadas
    const notificacoes = new Collection({
      name: 'notificacoes_enviadas',
      type: 'base',
      listRule: "@request.auth.role = 'gestor'",
      viewRule: "@request.auth.role = 'gestor'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'morador', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'mensagem', type: 'text' },
        { name: 'celular', type: 'text' },
        { name: 'data_envio', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'sucesso', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(notificacoes)
  },
  (app) => {
    // Reversão de banco de dados não suportada devido à perda massiva de dados
  },
)
