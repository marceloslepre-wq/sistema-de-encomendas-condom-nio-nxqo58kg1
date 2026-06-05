migrate(
  (app) => {
    const collections = [
      'carriers',
      'volume_types',
      'shelf_locations',
      'condos',
      'units',
      'recebimentos_auditoria',
      'parcels',
      'invitation_links',
      'notificacoes_enviadas',
      'templates_notificacao',
    ]

    const gestorRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')"

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)

        // Ensure 'gestor' has full access across all management modules
        if (col.createRule !== '') col.createRule = gestorRule
        if (col.updateRule !== '') col.updateRule = gestorRule
        if (col.deleteRule !== '')
          col.deleteRule =
            "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')"

        app.save(col)
      } catch (e) {
        console.log(`Skipping missing collection: ${name}`)
      }
    }

    try {
      const usersCol = app.findCollectionByNameOrId('users')
      usersCol.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin') || @request.auth.id = ''"
      usersCol.updateRule =
        "id = @request.auth.id || @request.auth.role = 'gestor' || @request.auth.role = 'admin'"
      usersCol.deleteRule =
        "id = @request.auth.id || @request.auth.role = 'gestor' || @request.auth.role = 'admin'"
      app.save(usersCol)
    } catch (e) {}
  },
  (app) => {
    // down migration
  },
)
