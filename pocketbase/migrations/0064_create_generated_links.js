migrate(
  (app) => {
    const collection = new Collection({
      name: 'generated_links',
      type: 'base',
      listRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      createRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'gestor' || @request.auth.role = 'admin'",
      fields: [
        { name: 'torre', type: 'text', required: true },
        { name: 'unidade', type: 'text', required: true },
        { name: 'link', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('generated_links')
    app.delete(collection)
  },
)
