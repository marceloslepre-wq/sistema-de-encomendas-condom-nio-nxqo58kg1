migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('torre')) {
      users.fields.add(new TextField({ name: 'torre' }))
    }
    if (!users.fields.getByName('unidade')) {
      users.fields.add(new TextField({ name: 'unidade' }))
    }
    if (!users.fields.getByName('cpf')) {
      users.fields.add(new TextField({ name: 'cpf' }))
    }
    users.createRule =
      "(@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')) || (@request.auth.id = '' && @request.body.role = 'morador')"
    app.save(users)

    const moradores = app.findCollectionByNameOrId('moradores')
    moradores.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'morador')"
    app.save(moradores)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('torre')
    users.fields.removeByName('unidade')
    users.fields.removeByName('cpf')
    users.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin') || @request.auth.id = ''"
    app.save(users)

    const moradores = app.findCollectionByNameOrId('moradores')
    moradores.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')"
    app.save(moradores)
  },
)
