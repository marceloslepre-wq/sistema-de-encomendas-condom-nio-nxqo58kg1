migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('parcels')
    col.fields.add(
      new NumberField({
        name: 'volumes',
        min: 1,
        onlyInt: true,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('parcels')
    col.fields.removeByName('volumes')
    app.save(col)
  },
)
