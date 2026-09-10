migrate(
  (app) => {
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      let changed = false

      if (!licencasCol.fields.getByName('override_max_usuarios')) {
        licencasCol.fields.add(
          new NumberField({
            name: 'override_max_usuarios',
            required: false,
            min: 0,
            onlyInt: true,
          }),
        )
        changed = true
      }

      if (!licencasCol.fields.getByName('override_max_unidades')) {
        licencasCol.fields.add(
          new NumberField({
            name: 'override_max_unidades',
            required: false,
            min: 0,
            onlyInt: true,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(licencasCol)
      }
    } catch (err) {
      console.log('Erro ao adicionar campos de override na collection licencas:', err)
      throw err
    }
  },
  (app) => {
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      let changed = false

      if (licencasCol.fields.getByName('override_max_usuarios')) {
        licencasCol.fields.removeByName('override_max_usuarios')
        changed = true
      }

      if (licencasCol.fields.getByName('override_max_unidades')) {
        licencasCol.fields.removeByName('override_max_unidades')
        changed = true
      }

      if (changed) {
        app.save(licencasCol)
      }
    } catch (_) {}
  },
)
