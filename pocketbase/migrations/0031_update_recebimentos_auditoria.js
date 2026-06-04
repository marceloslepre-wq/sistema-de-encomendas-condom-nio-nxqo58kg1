migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    col.fields.add(new TextField({ name: 'unidade' }))
    col.fields.add(new NumberField({ name: 'volumes' }))
    col.fields.add(new TextField({ name: 'carrier' }))
    col.fields.add(new TextField({ name: 'entregador_nome' }))
    col.fields.add(new TextField({ name: 'entregador_cpf' }))
    col.fields.add(new TextField({ name: 'entregador_celular' }))
    col.fields.add(
      new RelationField({
        name: 'unit_id',
        collectionId: app.findCollectionByNameOrId('units').id,
        maxSelect: 1,
      }),
    )
    col.fields.add(
      new RelationField({ name: 'resident_id', collectionId: '_pb_users_auth_', maxSelect: 1 }),
    )

    col.listRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem'"
    col.viewRule =
      "@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'triagem'"
    col.updateRule = "@request.auth.id != ''"

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    col.fields.removeByName('unidade')
    col.fields.removeByName('volumes')
    col.fields.removeByName('carrier')
    col.fields.removeByName('entregador_nome')
    col.fields.removeByName('entregador_cpf')
    col.fields.removeByName('entregador_celular')
    col.fields.removeByName('unit_id')
    col.fields.removeByName('resident_id')

    col.listRule = "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'"
    col.viewRule = "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'"
    col.updateRule = "@request.auth.id != ''"

    app.save(col)
  },
)
