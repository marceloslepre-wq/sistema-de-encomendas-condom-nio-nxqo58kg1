migrate(
  (app) => {
    const carriers = app.findCollectionByNameOrId('carriers')

    // Permitir que gestor, porteiro e portaria do mesmo condomínio (ou master/admin) listem, visualizem, criem, editem e excluam transportadoras
    carriers.listRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
    carriers.viewRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
    carriers.createRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
    carriers.updateRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro'))"
    carriers.deleteRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro'))"

    app.save(carriers)
  },
  (app) => {
    const carriers = app.findCollectionByNameOrId('carriers')

    carriers.updateRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
    carriers.deleteRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"

    app.save(carriers)
  },
)
