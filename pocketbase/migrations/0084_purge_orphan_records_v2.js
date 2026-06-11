migrate(
  (app) => {
    // 1. Purge historico_andamento orphans (recebimento_id not in recebimentos_auditoria)
    app
      .db()
      .newQuery(`
    DELETE FROM historico_andamento 
    WHERE recebimento_id NOT IN (SELECT id FROM recebimentos_auditoria)
  `)
      .execute()

    // 2. Purge recebimentos_auditoria orphans (missing morador/unidade, or referencing non-existent ones)
    app
      .db()
      .newQuery(`
    DELETE FROM recebimentos_auditoria
    WHERE morador_id = '' OR morador_id IS NULL 
       OR unidade_id = '' OR unidade_id IS NULL
       OR morador_id NOT IN (SELECT id FROM users)
       OR unidade_id NOT IN (SELECT id FROM units)
  `)
      .execute()

    // 3. Purge historico_andamento again for the newly deleted recebimentos
    app
      .db()
      .newQuery(`
    DELETE FROM historico_andamento 
    WHERE recebimento_id NOT IN (SELECT id FROM recebimentos_auditoria)
  `)
      .execute()
  },
  (app) => {
    // no-op
  },
)
