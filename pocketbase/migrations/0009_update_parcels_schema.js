migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('parcels')

    const statusField = col.fields.getByName('status')
    statusField.values = [
      'ENTRADA_PORTARIA',
      'EM_TRIAGEM',
      'LIBERADO_RETIRADA',
      'RETIRADO',
      'CANCELADO',
    ]

    col.fields.add(
      new FileField({
        name: 'photo',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    )
    col.fields.add(new TextField({ name: 'withdrawal_code' }))
    col.fields.add(new TextField({ name: 'shelf_location' }))
    col.fields.add(
      new SelectField({
        name: 'volume_type',
        maxSelect: 1,
        values: ['Envelope', 'Caixa Pequena', 'Caixa Média', 'Caixa Grande', 'Outros'],
      }),
    )

    col.addIndex('idx_parcels_withdrawal', false, 'withdrawal_code', '')
    col.addIndex('idx_parcels_status', false, 'status', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('parcels')
    col.fields.removeByName('photo')
    col.fields.removeByName('withdrawal_code')
    col.fields.removeByName('shelf_location')
    col.fields.removeByName('volume_type')

    const statusField = col.fields.getByName('status')
    statusField.values = [
      'RECEBIDO_PORTARIA',
      'EM_SALA',
      'CATALOGADO',
      'DISPONIVEL_RETIRADA',
      'RETIRADO',
      'CANCELADO',
    ]

    col.removeIndex('idx_parcels_withdrawal')
    col.removeIndex('idx_parcels_status')

    app.save(col)
  },
)
