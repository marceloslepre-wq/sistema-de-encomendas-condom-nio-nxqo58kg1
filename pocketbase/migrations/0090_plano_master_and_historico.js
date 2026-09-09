migrate(
  (app) => {
    // 1. Adicionar campo 'exclusivo_master' na collection 'planos'
    const planosCol = app.findCollectionByNameOrId('planos')
    if (!planosCol.fields.getByName('exclusivo_master')) {
      planosCol.fields.add(
        new BoolField({
          name: 'exclusivo_master',
          required: false,
        }),
      )
    }

    // Atualizar as regras de list/view de planos para impedir que não-masters vejam planos exclusivo_master
    // Masters e admins vêem todos os planos.
    // Usuários normais ou visitantes públicos vêem apenas planos com status 'ativo' e exclusivo_master != true
    planosCol.listRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (status = 'ativo' && (exclusivo_master = false || exclusivo_master = null))"
    planosCol.viewRule =
      "@request.auth.role = 'master' || @request.auth.role = 'admin' || (status = 'ativo' && (exclusivo_master = false || exclusivo_master = null))"
    app.save(planosCol)

    // 2. Criar ou atualizar o plano especial "Plano no Master"
    try {
      const existing = app.findFirstRecordByData('planos', 'nome', 'Plano no Master')
      existing.set('exclusivo_master', true)
      existing.set('preco_mensal', 0)
      existing.set('max_moradores', 0) // 0 significa ilimitado
      existing.set('max_units', 0) // 0 significa ilimitado
      existing.set('status', 'ativo')
      existing.set(
        'descricao',
        'Plano exclusivo Master com recursos completos e cadastros ilimitados sem prazo de expiração.',
      )
      existing.set('recursos_liberados', {
        ilimitado: true,
        notificacoes_whatsapp: true,
        relatorios_avancados: true,
        triagem_sala: true,
        multiplos_porteiros: true,
      })
      app.save(existing)
    } catch (_) {
      const planoMaster = new Record(planosCol)
      planoMaster.set('nome', 'Plano no Master')
      planoMaster.set(
        'descricao',
        'Plano exclusivo Master com recursos completos e cadastros ilimitados sem prazo de expiração.',
      )
      planoMaster.set('preco_mensal', 0)
      planoMaster.set('max_moradores', 0) // ilimitado
      planoMaster.set('max_units', 0) // ilimitado
      planoMaster.set('status', 'ativo')
      planoMaster.set('exclusivo_master', true)
      planoMaster.set('recursos_liberados', {
        ilimitado: true,
        notificacoes_whatsapp: true,
        relatorios_avancados: true,
        triagem_sala: true,
        multiplos_porteiros: true,
      })
      app.save(planoMaster)
    }

    // 3. Criar collection 'historico_licencas' para registrar mudanças de plano, ativações e renovações
    try {
      app.findCollectionByNameOrId('historico_licencas')
    } catch (_) {
      const condosCol = app.findCollectionByNameOrId('condos')
      const licencasCol = app.findCollectionByNameOrId('licencas')

      const histCol = new Collection({
        name: 'historico_licencas',
        type: 'base',
        listRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)",
        viewRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)",
        createRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)",
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
          { name: 'tipo_evento', type: 'text', required: true }, // ex: 'criacao', 'troca_plano', 'renovacao', 'reativacao_30d'
          { name: 'plano_nome', type: 'text', required: false },
          { name: 'data_expiracao', type: 'date', required: false },
          { name: 'descricao', type: 'text', required: false },
          { name: 'alterado_por', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_hist_condo_created ON historico_licencas (condo_id, created DESC)',
        ],
      })
      app.save(histCol)
    }

    // Registrar evento inicial para a licença existente se o histórico estiver vazio
    try {
      const histCol = app.findCollectionByNameOrId('historico_licencas')
      const licencas = app.findRecordsByFilter('licencas', '', '-created', 10, 0)
      for (const lic of licencas) {
        const cId = lic.getString('condo_id')
        const existingHist = app.findRecordsByFilter(
          'historico_licencas',
          `condo_id = '${cId}'`,
          '-created',
          1,
          0,
        )
        if (existingHist.length === 0) {
          let pNome = ''
          try {
            const p = app.findRecordById('planos', lic.getString('plano_id'))
            pNome = p.getString('nome')
          } catch (_) {}

          const rec = new Record(histCol)
          rec.set('condo_id', cId)
          rec.set('licenca_id', lic.id)
          rec.set('plano_id', lic.getString('plano_id'))
          rec.set('tipo_evento', 'criacao')
          rec.set('plano_nome', pNome)
          rec.set('data_expiracao', lic.getString('data_expiracao'))
          rec.set('descricao', `Início do período no plano ${pNome}`)
          rec.set('alterado_por', 'Sistema')
          app.save(rec)
        }
      }
    } catch (e) {
      console.log('Erro ao registrar histórico inicial:', e)
    }
  },
  (app) => {
    try {
      const histCol = app.findCollectionByNameOrId('historico_licencas')
      app.delete(histCol)
    } catch (_) {}

    try {
      const planoMaster = app.findFirstRecordByData('planos', 'nome', 'Plano no Master')
      app.delete(planoMaster)
    } catch (_) {}

    try {
      const planosCol = app.findCollectionByNameOrId('planos')
      planosCol.listRule = "status = 'ativo' || @request.auth.id != ''"
      planosCol.viewRule = "status = 'ativo' || @request.auth.id != ''"
      const f = planosCol.fields.getByName('exclusivo_master')
      if (f) {
        planosCol.fields.remove(f)
      }
      app.save(planosCol)
    } catch (_) {}
  },
)
