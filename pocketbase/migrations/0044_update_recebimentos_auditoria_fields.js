migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')

    if (!col.fields.getByName('unidade_id')) {
      col.fields.add(
        new RelationField({
          name: 'unidade_id',
          collectionId: app.findCollectionByNameOrId('units').id,
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('morador_id')) {
      col.fields.add(
        new RelationField({ name: 'morador_id', collectionId: '_pb_users_auth_', maxSelect: 1 }),
      )
    }
    if (!col.fields.getByName('entregador_nome')) {
      col.fields.add(new TextField({ name: 'entregador_nome' }))
    }
    if (!col.fields.getByName('entregador_cpf')) {
      col.fields.add(new TextField({ name: 'entregador_cpf' }))
    }
    if (!col.fields.getByName('codigo_rastreio')) {
      col.fields.add(new TextField({ name: 'codigo_rastreio' }))
    }
    if (!col.fields.getByName('recebido_por')) {
      col.fields.add(
        new RelationField({ name: 'recebido_por', collectionId: '_pb_users_auth_', maxSelect: 1 }),
      )
    }
    if (!col.fields.getByName('observacoes')) {
      col.fields.add(new TextField({ name: 'observacoes' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')

    col.fields.removeByName('unidade_id')
    col.fields.removeByName('morador_id')
    col.fields.removeByName('entregador_nome')
    col.fields.removeByName('entregador_cpf')
    col.fields.removeByName('codigo_rastreio')
    col.fields.removeByName('recebido_por')
    col.fields.removeByName('observacoes')

    app.save(col)
  },
)
