migrate(
  (app) => {
    // 1. Atualizar regras da coleção 'licencas' para permitir que o usuário autenticado do condomínio veja sua própria licença
    // listRule e viewRule:
    // "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      licencasCol.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      licencasCol.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      app.save(licencasCol)
    } catch (e) {
      console.log('Erro ao atualizar rules da collection licencas:', e)
    }

    // 2. Criar coleção 'pagamentos_renovacao' para auditoria e conferência dos pagamentos via Mercado Pago
    try {
      app.findCollectionByNameOrId('pagamentos_renovacao')
    } catch (_) {
      const condosCol = app.findCollectionByNameOrId('condos')
      const planosCol = app.findCollectionByNameOrId('planos')
      const licencasCol = app.findCollectionByNameOrId('licencas')

      const pagamentosCol = new Collection({
        name: 'pagamentos_renovacao',
        type: 'base',
        listRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')",
        viewRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')",
        createRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        fields: [
          {
            name: 'condo_id',
            type: 'relation',
            required: true,
            collectionId: condosCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'licenca_id',
            type: 'relation',
            required: false,
            collectionId: licencasCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'plano_id',
            type: 'relation',
            required: false,
            collectionId: planosCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'preference_id', type: 'text', required: false },
          { name: 'payment_id', type: 'text', required: false },
          { name: 'status', type: 'text', required: false },
          { name: 'valor', type: 'number', required: false },
          { name: 'detalhes', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pag_preference_id ON pagamentos_renovacao (preference_id)',
          'CREATE INDEX idx_pag_payment_id ON pagamentos_renovacao (payment_id)',
        ],
      })
      app.save(pagamentosCol)
    }
  },
  (app) => {
    try {
      const pagamentosCol = app.findCollectionByNameOrId('pagamentos_renovacao')
      app.delete(pagamentosCol)
    } catch (_) {}

    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      licencasCol.listRule = "@request.auth.id != ''"
      licencasCol.viewRule = "@request.auth.id != ''"
      app.save(licencasCol)
    } catch (_) {}
  },
)
