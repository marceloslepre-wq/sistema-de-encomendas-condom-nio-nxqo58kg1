migrate(
  (app) => {
    const collection = new Collection({
      name: 'moradores',
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
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'cpf', type: 'text', required: true },
        { name: 'torre', type: 'text', required: true },
        { name: 'apartamento', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('moradores')
    app.delete(collection)
  },
)
