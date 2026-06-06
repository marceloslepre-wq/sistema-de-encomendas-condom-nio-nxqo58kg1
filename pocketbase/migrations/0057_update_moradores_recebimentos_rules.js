migrate(
  (app) => {
    const moradores = app.findCollectionByNameOrId('moradores')
    moradores.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || @request.auth.role = 'morador')"
    moradores.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || @request.auth.role = 'morador')"
    app.save(moradores)

    const rec = app.findCollectionByNameOrId('recebimentos_auditoria')
    rec.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || @request.auth.role = 'morador')"
    rec.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem' || @request.auth.role = 'morador')"
    app.save(rec)
  },
  (app) => {
    const moradores = app.findCollectionByNameOrId('moradores')
    moradores.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')"
    moradores.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem')"
    app.save(moradores)

    const rec = app.findCollectionByNameOrId('recebimentos_auditoria')
    rec.listRule =
      "@request.auth.role = 'portaria' || @request.auth.role = 'triagem' || @request.auth.role = 'gestor'"
    rec.viewRule =
      "@request.auth.role = 'portaria' || @request.auth.role = 'triagem' || @request.auth.role = 'gestor'"
    app.save(rec)
  },
)
