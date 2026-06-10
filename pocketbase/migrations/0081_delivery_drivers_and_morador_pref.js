migrate(
  (app) => {
    const entregadores = new Collection({
      name: 'entregadores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem')",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cpf', type: 'text', required: true },
        { name: 'celular', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(entregadores)

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!users.fields.getByName('permitir_retirada_terceiros')) {
        users.fields.add(new BoolField({ name: 'permitir_retirada_terceiros' }))
        app.save(users)
      }
    } catch (e) {
      console.log('Error updating users', e)
    }

    try {
      const moradores = app.findCollectionByNameOrId('moradores')
      if (!moradores.fields.getByName('permitir_retirada_terceiros')) {
        moradores.fields.add(new BoolField({ name: 'permitir_retirada_terceiros' }))
        app.save(moradores)
      }
    } catch (e) {
      console.log('Error updating moradores', e)
    }
  },
  (app) => {
    try {
      const entregadores = app.findCollectionByNameOrId('entregadores')
      app.delete(entregadores)
    } catch (e) {}

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.fields.removeByName('permitir_retirada_terceiros')
      app.save(users)
    } catch (e) {}

    try {
      const moradores = app.findCollectionByNameOrId('moradores')
      moradores.fields.removeByName('permitir_retirada_terceiros')
      app.save(moradores)
    } catch (e) {}
  },
)
