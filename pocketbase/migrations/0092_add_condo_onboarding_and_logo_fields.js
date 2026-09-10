migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('condos')

    if (!col.fields.getByName('email')) {
      col.fields.add(
        new EmailField({
          name: 'email',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('cidade')) {
      col.fields.add(
        new TextField({
          name: 'cidade',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('estado')) {
      col.fields.add(
        new TextField({
          name: 'estado',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('responsavel')) {
      col.fields.add(
        new TextField({
          name: 'responsavel',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('logo')) {
      col.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 3145728, // 3MB (>= 2MB)
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('condos')
    if (col.fields.getByName('logo')) col.fields.removeByName('logo')
    if (col.fields.getByName('responsavel')) col.fields.removeByName('responsavel')
    if (col.fields.getByName('estado')) col.fields.removeByName('estado')
    if (col.fields.getByName('cidade')) col.fields.removeByName('cidade')
    if (col.fields.getByName('email')) col.fields.removeByName('email')
    app.save(col)
  },
)
