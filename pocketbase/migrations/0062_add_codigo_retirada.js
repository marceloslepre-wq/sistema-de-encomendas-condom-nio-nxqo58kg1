migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    if (!col.fields.getByName('codigo_retirada')) {
      col.fields.add(new TextField({ name: 'codigo_retirada' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    if (col.fields.getByName('codigo_retirada')) {
      col.fields.removeByName('codigo_retirada')
    }
    app.save(col)
  },
)
