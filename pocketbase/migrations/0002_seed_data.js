migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const condos = app.findCollectionByNameOrId('condos')
    const units = app.findCollectionByNameOrId('units')
    const parcels = app.findCollectionByNameOrId('parcels')

    let condo
    try {
      condo = app.findFirstRecordByData('condos', 'name', 'Condomínio Vista Linda')
    } catch (_) {
      condo = new Record(condos)
      condo.set('name', 'Condomínio Vista Linda')
      condo.set('address', 'Rua das Flores, 123')
      condo.set('cnpj', '12.345.678/0001-90')
      condo.set('phone', '11 99999-9999')
      condo.set('janitor_settings', { shifts: '24h', guards: 4 })
      condo.set('notifications_enabled', true)
      app.save(condo)
    }

    let unitA101
    try {
      unitA101 = app.findFirstRecordByData('units', 'apartment', '101')
    } catch (_) {
      unitA101 = new Record(units)
      unitA101.set('tower', 'A')
      unitA101.set('apartment', '101')
      unitA101.set('condo_id', condo.id)
      app.save(unitA101)
    }

    let unitA102
    try {
      unitA102 = app.findFirstRecordByData('units', 'apartment', '102')
    } catch (_) {
      unitA102 = new Record(units)
      unitA102.set('tower', 'A')
      unitA102.set('apartment', '102')
      unitA102.set('condo_id', condo.id)
      app.save(unitA102)
    }

    let unitB201
    try {
      unitB201 = app.findFirstRecordByData('units', 'apartment', '201')
    } catch (_) {
      unitB201 = new Record(units)
      unitB201.set('tower', 'B')
      unitB201.set('apartment', '201')
      unitB201.set('condo_id', condo.id)
      app.save(unitB201)
    }

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
    } catch (_) {
      const gestor = new Record(users)
      gestor.setEmail('marceloslepre@gmail.com')
      gestor.setPassword('Skip@Pass')
      gestor.setVerified(true)
      gestor.set('name', 'Gestor Marcelo')
      gestor.set('role', 'gestor')
      gestor.set('status', 'Ativo')
      app.save(gestor)
    }

    let morador
    try {
      morador = app.findAuthRecordByEmail('_pb_users_auth_', 'morador@example.com')
    } catch (_) {
      morador = new Record(users)
      morador.setEmail('morador@example.com')
      morador.setPassword('Skip@Pass')
      morador.setVerified(true)
      morador.set('name', 'João Silva')
      morador.set('role', 'morador')
      morador.set('status', 'Ativo')
      morador.set('unit_id', unitA101.id)
      app.save(morador)
    }

    try {
      app.findFirstRecordByData('parcels', 'tracking_code', 'BR123456789')
    } catch (_) {
      const p1 = new Record(parcels)
      p1.set('tracking_code', 'BR123456789')
      p1.set('unit_id', unitA101.id)
      p1.set('resident_id', morador.id)
      p1.set('carrier', 'Correios')
      p1.set('status', 'DISPONIVEL_RETIRADA')
      const d1 = new Date()
      d1.setDate(d1.getDate() - 2)
      p1.set('entry_date', d1.toISOString())
      app.save(p1)
    }

    try {
      app.findFirstRecordByData('parcels', 'tracking_code', 'ML987654321')
    } catch (_) {
      const p2 = new Record(parcels)
      p2.set('tracking_code', 'ML987654321')
      p2.set('unit_id', unitB201.id)
      p2.set('carrier', 'Mercado Livre')
      p2.set('status', 'RECEBIDO_PORTARIA')
      const d2 = new Date()
      d2.setDate(d2.getDate() - 1)
      p2.set('entry_date', d2.toISOString())
      app.save(p2)
    }
  },
  (app) => {
    // Empty revert for seed
  },
)
