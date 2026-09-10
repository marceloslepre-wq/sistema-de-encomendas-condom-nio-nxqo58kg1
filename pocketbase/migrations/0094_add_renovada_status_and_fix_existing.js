migrate(
  (app) => {
    // 1. Atualizar o campo status da coleção licencas para incluir 'renovada' e 'Renovada'
    const licencasCol = app.findCollectionByNameOrId('licencas')
    const statusField = licencasCol.fields.getByName('status')
    if (statusField && statusField.values) {
      let changed = false
      if (!statusField.values.includes('renovada')) {
        statusField.values.push('renovada')
        changed = true
      }
      if (!statusField.values.includes('Renovada')) {
        statusField.values.push('Renovada')
        changed = true
      }
      if (changed) {
        app.save(licencasCol)
      }
    }

    // 2. Corrigir a licença específica informada no requisito: 8ewq93v5xlhuliq
    try {
      const rec = app.findFirstRecordByData('licencas', 'id', '8ewq93v5xlhuliq')
      rec.set('status', 'renovada')
      app.save(rec)
    } catch (_) {
      // Se findFirstRecordByData lançar erro ou já não existir
      try {
        app
          .db()
          .newQuery("UPDATE licencas SET status = 'renovada' WHERE id = '8ewq93v5xlhuliq'")
          .execute()
      } catch (errDb) {
        console.log('Aviso ao atualizar licença 8ewq93v5xlhuliq via SQL:', errDb)
      }
    }

    // 3. Corrigir quaisquer outros casos na base onde há mais de uma licença 'ativa' para o mesmo condomínio,
    // marcando como 'renovada' todas exceto a mais recente (maior data criada) de cada condomínio.
    try {
      const condos = app.findRecordsByFilter('condos', '', 'name', 500, 0)
      for (let i = 0; i < condos.length; i++) {
        const condoId = condos[i].id
        // Buscar todas as licenças com status 'ativa' deste condomínio, ordenadas pela mais recente primeiro
        const ativas = app.findRecordsByFilter(
          'licencas',
          `condo_id = '${condoId}' && (status = 'ativa' || status = 'ativo')`,
          '-created',
          100,
          0,
        )
        // Se houver mais de 1 licença ativa, manter a primeira (mais recente) e marcar as demais como 'renovada'
        if (ativas && ativas.length > 1) {
          for (let j = 1; j < ativas.length; j++) {
            ativas[j].set('status', 'renovada')
            app.save(ativas[j])
          }
        }
      }
    } catch (errLoop) {
      console.log('Erro ao processar deduplicação de licenças ativas:', errLoop)
    }
  },
  (app) => {
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      const statusField = licencasCol.fields.getByName('status')
      if (statusField && statusField.values) {
        statusField.values = statusField.values.filter((v) => v !== 'renovada' && v !== 'Renovada')
        app.save(licencasCol)
      }
    } catch (_) {}
  },
)
