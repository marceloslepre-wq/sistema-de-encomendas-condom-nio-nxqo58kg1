migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('moradores')
    // Permite que o PRÓPRIO morador autentique e atualize apenas as preferências
    // do seu registro (telefone, permitir_retirada_terceiros, notificacoes_whatsapp),
    // desde que o e-mail bata com o registro e nenhum campo administrativo mude.
    col.updateRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || " +
      "(@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor') || " +
      "(@request.auth.role = 'morador' && @request.auth.condo_id != '' && " +
      'condo_id = @request.auth.condo_id && email = @request.auth.email && ' +
      '@request.body.nome:changed = false && ' +
      '@request.body.email:changed = false && ' +
      '@request.body.cpf:changed = false && ' +
      '@request.body.torre:changed = false && ' +
      '@request.body.apartamento:changed = false && ' +
      '@request.body.condo_id:changed = false)'
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('moradores')
    col.updateRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
    app.save(col)
  },
)
