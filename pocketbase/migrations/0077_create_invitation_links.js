migrate(
  (app) => {
    const collection = new Collection({
      name: 'invitation_links',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      fields: [
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['gestor', 'porteiro', 'portaria', 'triagem', 'morador'],
          maxSelect: 1,
        },
        { name: 'torre', type: 'text' },
        { name: 'unidade', type: 'text' },
        { name: 'token', type: 'text', required: true },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_invitation_token ON invitation_links (token)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('invitation_links')
    app.delete(collection)
  },
)
