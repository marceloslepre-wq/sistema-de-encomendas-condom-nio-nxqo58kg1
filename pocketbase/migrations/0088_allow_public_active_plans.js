migrate(
  (app) => {
    try {
      const planosCol = app.findCollectionByNameOrId('planos')
      // Permitir visualização e listagem pública para planos com status 'ativo'
      planosCol.listRule = "status = 'ativo' || @request.auth.id != ''"
      planosCol.viewRule = "status = 'ativo' || @request.auth.id != ''"
      app.save(planosCol)
    } catch (e) {
      console.log('Erro ao atualizar regras de leitura da collection planos:', e)
    }
  },
  (app) => {
    try {
      const planosCol = app.findCollectionByNameOrId('planos')
      planosCol.listRule = "@request.auth.id != ''"
      planosCol.viewRule = "@request.auth.id != ''"
      app.save(planosCol)
    } catch (_) {}
  },
)
