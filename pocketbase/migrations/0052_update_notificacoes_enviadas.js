migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('notificacoes_enviadas')

    if (!col.fields.getByName('sender_match')) {
      col.fields.add(new BoolField({ name: 'sender_match' }))
    }

    if (!col.fields.getByName('sender_number')) {
      col.fields.add(new TextField({ name: 'sender_number' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('notificacoes_enviadas')
    col.fields.removeByName('sender_match')
    col.fields.removeByName('sender_number')
    app.save(col)
  },
)
