migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('invitation_links')

    let modified = false
    if (!col.fields.getByName('expires_at')) {
      col.fields.add(new DateField({ name: 'expires_at' }))
      modified = true
    }

    if (!col.fields.getByName('unit_id')) {
      const unitsCol = app.findCollectionByNameOrId('units')
      col.fields.add(
        new RelationField({
          name: 'unit_id',
          collectionId: unitsCol.id,
          maxSelect: 1,
        }),
      )
      modified = true
    }

    if (modified) {
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('invitation_links')

    let modified = false
    if (col.fields.getByName('expires_at')) {
      col.fields.removeByName('expires_at')
      modified = true
    }

    if (col.fields.getByName('unit_id')) {
      col.fields.removeByName('unit_id')
      modified = true
    }

    if (modified) {
      app.save(col)
    }
  },
)
