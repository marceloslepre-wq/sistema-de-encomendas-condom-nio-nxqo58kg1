migrate(
  (app) => {
    const tmplCol = app.findCollectionByNameOrId('templates_notificacao')

    if (!tmplCol.fields.getByName('flow_stage')) {
      tmplCol.fields.add(
        new SelectField({
          name: 'flow_stage',
          maxSelect: 1,
          values: [
            'ENTRADA_PORTARIA',
            'EM_TRIAGEM',
            'SALA_ENCOMENDA',
            'LIBERADO_RETIRADA',
            'RETIRADO',
            'CANCELADO',
            'LEMBRETE',
          ],
        }),
      )
    }

    if (!tmplCol.fields.getByName('reminder_frequency')) {
      tmplCol.fields.add(new NumberField({ name: 'reminder_frequency' }))
    }

    if (!tmplCol.fields.getByName('reminder_time')) {
      tmplCol.fields.add(new TextField({ name: 'reminder_time' }))
    }

    app.save(tmplCol)

    const recCol = app.findCollectionByNameOrId('recebimentos_auditoria')
    if (!recCol.fields.getByName('last_reminder_sent')) {
      recCol.fields.add(new DateField({ name: 'last_reminder_sent' }))
    }
    app.save(recCol)

    app
      .db()
      .newQuery(`
    UPDATE templates_notificacao 
    SET flow_stage = status 
    WHERE status IN ('ENTRADA_PORTARIA', 'EM_TRIAGEM', 'SALA_ENCOMENDA', 'LIBERADO_RETIRADA', 'RETIRADO', 'CANCELADO', 'LEMBRETE')
  `)
      .execute()
  },
  (app) => {
    const tmplCol = app.findCollectionByNameOrId('templates_notificacao')
    tmplCol.fields.removeByName('flow_stage')
    tmplCol.fields.removeByName('reminder_frequency')
    tmplCol.fields.removeByName('reminder_time')
    app.save(tmplCol)

    const recCol = app.findCollectionByNameOrId('recebimentos_auditoria')
    recCol.fields.removeByName('last_reminder_sent')
    app.save(recCol)
  },
)
