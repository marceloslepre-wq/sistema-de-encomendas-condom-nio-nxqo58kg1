migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.listRule =
      "id = @request.auth.id || @request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    users.viewRule =
      "id = @request.auth.id || @request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    app.save(users)

    const parcels = app.findCollectionByNameOrId('parcels')
    parcels.fields.add(new TextField({ name: 'courier_name' }))
    parcels.fields.add(new TextField({ name: 'courier_cpf' }))
    parcels.fields.add(
      new RelationField({ name: 'porter_id', collectionId: '_pb_users_auth_', maxSelect: 1 }),
    )
    app.save(parcels)

    const auditLogs = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'action', type: 'text', required: true },
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'parcel_id',
          type: 'relation',
          required: false,
          collectionId: parcels.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(auditLogs)

    const smsVerifications = new Collection({
      name: 'sms_verifications',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'phone', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'expires_at', type: 'date', required: true },
        { name: 'used', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(smsVerifications)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    app.save(users)

    const parcels = app.findCollectionByNameOrId('parcels')
    parcels.fields.removeByName('courier_name')
    parcels.fields.removeByName('courier_cpf')
    parcels.fields.removeByName('porter_id')
    app.save(parcels)

    const auditLogs = app.findCollectionByNameOrId('audit_logs')
    app.delete(auditLogs)

    const sms = app.findCollectionByNameOrId('sms_verifications')
    app.delete(sms)
  },
)
