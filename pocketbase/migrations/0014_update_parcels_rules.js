migrate(
  (app) => {
    const parcels = app.findCollectionByNameOrId('parcels')
    parcels.listRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || unit_id = @request.auth.unit_id"
    parcels.viewRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || unit_id = @request.auth.unit_id"
    app.save(parcels)
  },
  (app) => {
    const parcels = app.findCollectionByNameOrId('parcels')
    parcels.listRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || unit_id = @request.auth.unit_id"
    parcels.viewRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || unit_id = @request.auth.unit_id"
    app.save(parcels)
  },
)
