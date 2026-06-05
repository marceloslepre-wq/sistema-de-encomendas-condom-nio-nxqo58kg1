migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // 1. Truncate existing users to prevent credential conflicts
    app.truncateCollection(users)

    // 2. Update role field to include new roles
    if (users.fields.getByName('role')) {
      users.fields.removeByName('role')
    }

    users.fields.add(
      new SelectField({
        name: 'role',
        maxSelect: 1,
        values: ['gestor', 'porteiro', 'portaria', 'triagem', 'morador'],
      }),
    )
    app.save(users)

    // 3. Seed new default user accounts
    try {
      const gestor = new Record(users)
      gestor.setEmail('gestor@email.com')
      gestor.setPassword('senha123')
      gestor.setVerified(true)
      gestor.set('name', 'Gestor')
      gestor.set('role', 'gestor')
      app.save(gestor)
    } catch (err) {
      console.log('Error seeding gestor:', err)
    }

    try {
      const portaria = new Record(users)
      portaria.setEmail('porteiro@email.com')
      portaria.setPassword('senha123')
      portaria.setVerified(true)
      portaria.set('name', 'Portaria')
      portaria.set('role', 'portaria')
      app.save(portaria)
    } catch (err) {
      console.log('Error seeding portaria:', err)
    }

    try {
      const morador = new Record(users)
      morador.setEmail('morador@email.com')
      morador.setPassword('senha123')
      morador.setVerified(true)
      morador.set('name', 'Morador')
      morador.set('role', 'morador')
      app.save(morador)
    } catch (err) {
      console.log('Error seeding morador:', err)
    }

    // 4. Update API rules across common collections to fix 401s for 'portaria'
    // Resolving the discrepancy where DB rules used 'porteiro' while frontend used 'portaria'
    const collectionsToUpdate = [
      'recebimentos_auditoria',
      'parcels',
      'condos',
      'units',
      'invitation_links',
      'audit_logs',
      'templates_notificacao',
      'notificacoes_enviadas',
      'volume_types',
      'shelf_locations',
      'carriers',
      'logistics',
    ]

    for (const name of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(name)
        let changed = false
        for (const rule of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
          if (col[rule]) {
            if (col[rule].includes("'porteiro'")) {
              col[rule] = col[rule].replace(/'porteiro'/g, "'portaria'")
              changed = true
            }
            if (col[rule].includes('"porteiro"')) {
              col[rule] = col[rule].replace(/"porteiro"/g, "'portaria'")
              changed = true
            }
          }
        }
        if (changed) {
          app.save(col)
        }
      } catch (_) {}
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (users.fields.getByName('role')) {
      users.fields.removeByName('role')
    }

    users.fields.add(
      new SelectField({
        name: 'role',
        maxSelect: 1,
        values: ['porteiro', 'triagem', 'gestor'],
      }),
    )
    app.save(users)

    try {
      const gestor = app.findAuthRecordByEmail('users', 'gestor@email.com')
      if (gestor) app.delete(gestor)
    } catch (_) {}
    try {
      const portaria = app.findAuthRecordByEmail('users', 'porteiro@email.com')
      if (portaria) app.delete(portaria)
    } catch (_) {}
    try {
      const morador = app.findAuthRecordByEmail('users', 'morador@email.com')
      if (morador) app.delete(morador)
    } catch (_) {}
  },
)
