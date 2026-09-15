migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('entregadores')
      const cpfField = col.fields.getByName('cpf')
      if (cpfField) {
        cpfField.required = false
        app.save(col)
      }
    } catch (e) {
      console.log('Erro ao atualizar campo cpf em entregadores:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('entregadores')
      const cpfField = col.fields.getByName('cpf')
      if (cpfField) {
        cpfField.required = true
        app.save(col)
      }
    } catch (e) {
      console.log('Erro ao reverter campo cpf em entregadores:', e)
    }
  },
)
