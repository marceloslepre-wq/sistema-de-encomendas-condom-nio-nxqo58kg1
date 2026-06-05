migrate(
  (app) => {
    const condos = app.findCollectionByNameOrId('condos')

    const collection = new Collection({
      name: 'invitation_links',
      type: 'base',
      listRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      createRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      fields: [
        { name: 'token', type: 'text', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['gestor', 'porteiro', 'portaria', 'triagem', 'morador'],
          maxSelect: 1,
        },
        {
          name: 'condo_id',
          type: 'relation',
          required: true,
          collectionId: condos.id,
          maxSelect: 1,
        },
        { name: 'used', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('invitation_links')
    app.delete(collection)
  },
)
