migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.removeIndex('idx_users_phone')
    app.save(usersCol)

    const moradoresCol = app.findCollectionByNameOrId('moradores')
    moradoresCol.removeIndex('idx_moradores_telefone')
    const telefoneField = moradoresCol.fields.getByName('telefone')
    if (telefoneField) {
      telefoneField.required = false
    }
    app.save(moradoresCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.addIndex('idx_users_phone', true, 'phone', "phone != ''")
    app.save(usersCol)

    const moradoresCol = app.findCollectionByNameOrId('moradores')
    moradoresCol.addIndex('idx_moradores_telefone', true, 'telefone', "telefone != ''")
    const telefoneField = moradoresCol.fields.getByName('telefone')
    if (telefoneField) {
      telefoneField.required = true
    }
    app.save(moradoresCol)
  },
)
