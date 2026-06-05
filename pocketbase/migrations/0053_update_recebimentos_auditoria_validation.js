migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')

    if (!col.fields.getByName('celular_validacao')) {
      col.fields.add(new TextField({ name: 'celular_validacao', required: false }))
    }

    if (!col.fields.getByName('codigo_validacao')) {
      col.fields.add(new TextField({ name: 'codigo_validacao', required: false }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')

    try {
      col.fields.removeByName('celular_validacao')
    } catch (_) {}
    try {
      col.fields.removeByName('codigo_validacao')
    } catch (_) {}

    app.save(col)
  },
)
