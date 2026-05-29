migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.add(new TextField({ name: 'cpf' }))
    users.fields.add(new TextField({ name: 'phone' }))
    users.fields.add(
      new SelectField({ name: 'role', values: ['gestor', 'portaria', 'morador'], maxSelect: 1 }),
    )
    users.fields.add(
      new SelectField({ name: 'status', values: ['Ativo', 'Bloqueado', 'Pendente'], maxSelect: 1 }),
    )
    app.save(users)

    const condos = new Collection({
      name: 'condos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.role = "gestor"',
      updateRule: '@request.auth.role = "gestor"',
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'address', type: 'text' },
        { name: 'cnpj', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'janitor_settings', type: 'json' },
        { name: 'notifications_enabled', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(condos)

    const units = new Collection({
      name: 'units',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.role = "gestor"',
      updateRule: '@request.auth.role = "gestor"',
      deleteRule: null,
      fields: [
        { name: 'tower', type: 'text', required: true },
        { name: 'apartment', type: 'text', required: true },
        { name: 'condo_id', type: 'relation', collectionId: condos.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(units)

    users.fields.add(new RelationField({ name: 'unit_id', collectionId: units.id, maxSelect: 1 }))
    app.save(users)

    const invitation_links = new Collection({
      name: 'invitation_links',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.role = "gestor"',
      updateRule: '',
      deleteRule: null,
      fields: [
        { name: 'unit_id', type: 'relation', collectionId: units.id, maxSelect: 1, required: true },
        { name: 'token', type: 'text', required: true },
        { name: 'expires_at', type: 'date', required: true },
        { name: 'used', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(invitation_links)

    const parcels = new Collection({
      name: 'parcels',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        { name: 'tracking_code', type: 'text' },
        { name: 'unit_id', type: 'relation', collectionId: units.id, maxSelect: 1, required: true },
        { name: 'resident_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'carrier', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: [
            'RECEBIDO_PORTARIA',
            'EM_SALA',
            'CATALOGADO',
            'DISPONIVEL_RETIRADA',
            'RETIRADO',
            'CANCELADO',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'entry_date', type: 'date' },
        { name: 'exit_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(parcels)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('parcels'))
      app.delete(app.findCollectionByNameOrId('invitation_links'))
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.fields.removeByName('unit_id')
      users.fields.removeByName('cpf')
      users.fields.removeByName('phone')
      users.fields.removeByName('role')
      users.fields.removeByName('status')
      app.save(users)
      app.delete(app.findCollectionByNameOrId('units'))
      app.delete(app.findCollectionByNameOrId('condos'))
    } catch (_) {}
  },
)
