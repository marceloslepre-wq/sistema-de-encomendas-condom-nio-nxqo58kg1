migrate(
  (app) => {
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      const statusField = licencasCol.fields.getByName('status')
      if (statusField && statusField.values) {
        if (!statusField.values.includes('Renovada')) {
          statusField.values.push('Renovada')
        }
        if (!statusField.values.includes('renovada')) {
          statusField.values.push('renovada')
        }
        app.save(licencasCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar campo status na collection licencas:', e)
      throw e
    }

    try {
      app.db().newQuery(
        "UPDATE licencas SET status = 'Renovada' WHERE id = '8ewq93v5xlhuliq'"
      ).execute()
    } catch (e) {
      console.log('Erro ao atualizar licença específica 8ewq93v5xlhuliq:', e)
    }

    try {
      app.db().newQuery(`
        UPDATE licencas
        SET status = 'Renovada'
        WHERE (status = 'ativa' OR status = 'ativo')
          AND id NOT IN (
            SELECT l1.id
            FROM licencas l1
            INNER JOIN (
              SELECT condo_id, MAX(created) as max_created
              FROM licencas
              WHERE (status = 'ativa' OR status = 'ativo')
              GROUP BY condo_id
            ) l2 ON l1.condo_id = l2.condo_id AND l1.created = l2.max_created
          )
          AND condo_id IN (
            SELECT condo_id
            FROM licencas
            WHERE (status = 'ativa' OR status = 'ativo')
            GROUP BY condo_id
            HAVING COUNT(id) > 1
          )
      `).execute()
    } catch (e) {
      console.log('Erro ao atualizar licenças antigas duplicadas ativas:', e)
    }
  },
  (app) => {
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      const statusField = licencasCol.fields.getByName('status')
      if (statusField && statusField.values) {
        statusField.values = statusField.values.filter(
          (v) => v !== 'Renovada' && v !== 'renovada'
        )
        app.save(licencasCol)
      }
    } catch (_) {}
  }
)
