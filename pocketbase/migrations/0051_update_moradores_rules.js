migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('moradores')
    col.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')"
    col.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('moradores')
    col.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')"
    col.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin')"
    app.save(col)
  },
)
