migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    if (!col.fields.getByName('photo')) {
      col.fields.add(
        new FileField({
          name: 'photo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimentos_auditoria')
    if (col.fields.getByName('photo')) {
      col.fields.removeByName('photo')
      app.save(col)
    }
  },
)
