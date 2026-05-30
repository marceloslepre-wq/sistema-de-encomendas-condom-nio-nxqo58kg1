migrate(
  (app) => {
    // 1. Update condos
    const condos = app.findCollectionByNameOrId('condos')
    if (!condos.fields.getByName('exige_validacao_sms')) {
      condos.fields.add(new BoolField({ name: 'exige_validacao_sms' }))
    }
    app.save(condos)

    // Default value for existing condos
    app.db().newQuery('UPDATE condos SET exige_validacao_sms = 1').execute()

    // 2. Update users
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('autoriza_retirada_terceiros')) {
      users.fields.add(new BoolField({ name: 'autoriza_retirada_terceiros' }))
    }
    app.save(users)

    // Default value for existing users
    app.db().newQuery('UPDATE users SET autoriza_retirada_terceiros = 1').execute()

    // 3. Update parcels list/view rules
    const parcels = app.findCollectionByNameOrId('parcels')
    const rule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || resident_id = @request.auth.id || (unit_id = @request.auth.unit_id && (resident_id = '' || resident_id.autoriza_retirada_terceiros = true))"
    parcels.listRule = rule
    parcels.viewRule = rule
    app.save(parcels)
  },
  (app) => {
    const condos = app.findCollectionByNameOrId('condos')
    condos.fields.removeByName('exige_validacao_sms')
    app.save(condos)

    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('autoriza_retirada_terceiros')
    app.save(users)

    const parcels = app.findCollectionByNameOrId('parcels')
    const oldRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || unit_id = @request.auth.unit_id"
    parcels.listRule = oldRule
    parcels.viewRule = oldRule
    app.save(parcels)
  },
)
