migrate(
  (app) => {
    const parcels = app.findCollectionByNameOrId('parcels')
    parcels.listRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || unit_id = @request.auth.unit_id"
    parcels.viewRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || unit_id = @request.auth.unit_id"
    app.save(parcels)

    const users = app.findCollectionByNameOrId('users')
    try {
      users.addIndex('idx_users_cpf', true, 'cpf', "cpf != ''")
    } catch (e) {}
    app.save(users)
  },
  (app) => {
    const parcels = app.findCollectionByNameOrId('parcels')
    parcels.listRule = ''
    parcels.viewRule = ''
    app.save(parcels)

    const users = app.findCollectionByNameOrId('users')
    try {
      users.removeIndex('idx_users_cpf')
    } catch (e) {}
    app.save(users)
  },
)
