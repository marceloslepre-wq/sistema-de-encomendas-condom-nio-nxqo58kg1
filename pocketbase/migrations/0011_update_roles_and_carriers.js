migrate(
  (app) => {
    // 1. Update roles in users to include 'triagem'
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = usersCol.fields.getByName('role')
    if (roleField && roleField.values) {
      if (!roleField.values.includes('triagem')) {
        roleField.values.push('triagem')
      }
    } else {
      // Fallback if field structure is different
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          values: ['gestor', 'portaria', 'morador', 'triagem'],
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    // 2. Create carriers collection
    try {
      app.findCollectionByNameOrId('carriers')
    } catch (_) {
      const carriersCol = new Collection({
        name: 'carriers',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'gestor'",
        updateRule: "@request.auth.role = 'gestor'",
        deleteRule: "@request.auth.role = 'gestor'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'phone', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(carriersCol)
    }

    // 3. Make condo_id required in units to ensure data integrity
    try {
      const unitsCol = app.findCollectionByNameOrId('units')
      const condoField = unitsCol.fields.getByName('condo_id')
      if (condoField) {
        condoField.required = true
        app.save(unitsCol)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const unitsCol = app.findCollectionByNameOrId('units')
      const condoField = unitsCol.fields.getByName('condo_id')
      if (condoField) {
        condoField.required = false
        app.save(unitsCol)
      }
    } catch (_) {}

    try {
      const carriersCol = app.findCollectionByNameOrId('carriers')
      app.delete(carriersCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const roleField = usersCol.fields.getByName('role')
      if (roleField && roleField.values) {
        roleField.values = roleField.values.filter((v) => v !== 'triagem')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
