migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    if (!col.fields.getByName('descricao')) {
      col.fields.add(new TextField({ name: 'descricao' }))
    }
    if (!col.fields.getByName('codigo_validado')) {
      col.fields.add(new TextField({ name: 'codigo_validado' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    col.fields.removeByName('descricao')
    col.fields.removeByName('codigo_validado')
    app.save(col)
  },
)
