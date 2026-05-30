migrate((app) => {
  let admin
  try {
    admin = app.findAuthRecordByEmail('users', 'marceloslepre@gmail.com')
  } catch (_) {
    const usersCol = app.findCollectionByNameOrId('users')
    admin = new Record(usersCol)
    admin.setEmail('marceloslepre@gmail.com')
    admin.setPassword('Skip@Pass')
    admin.setVerified(true)
    admin.set('name', 'Marcelo (Gestor)')
    admin.set('role', 'gestor')
    admin.set('status', 'Ativo')
    app.save(admin)
  }

  const condos = app.findCollectionByNameOrId('condos')
  let condo
  try {
    condo = app.findFirstRecordByData('condos', 'name', 'Condomínio Residencial Parque')
  } catch (_) {
    condo = new Record(condos)
    condo.set('name', 'Condomínio Residencial Parque')
    app.save(condo)
  }

  const unitsCol = app.findCollectionByNameOrId('units')
  const units = []
  for (const apt of ['101', '102', '103']) {
    let unit
    try {
      unit = app.findFirstRecordByData('units', 'apartment', apt)
    } catch (_) {
      unit = new Record(unitsCol)
      unit.set('tower', 'A')
      unit.set('apartment', apt)
      unit.set('condo_id', condo.id)
      app.save(unit)
    }
    units.push(unit)
  }

  const usersCol = app.findCollectionByNameOrId('users')
  const residents = []
  for (let i = 0; i < units.length; i++) {
    let res
    try {
      res = app.findAuthRecordByEmail('users', `res${i}@test.com`)
    } catch (_) {
      res = new Record(usersCol)
      res.setEmail(`res${i}@test.com`)
      res.setPassword('Skip@Pass')
      res.setVerified(true)
      res.set('name', `Morador Apt ${units[i].getString('apartment')}`)
      res.set('role', 'morador')
      res.set('status', 'Ativo')
      res.set('unit_id', units[i].id)
      app.save(res)
    }
    residents.push(res)
  }

  let portaria
  try {
    portaria = app.findAuthRecordByEmail('users', `portaria@test.com`)
  } catch (_) {
    portaria = new Record(usersCol)
    portaria.setEmail(`portaria@test.com`)
    portaria.setPassword('Skip@Pass')
    portaria.setVerified(true)
    portaria.set('name', `Porteiro Zé`)
    portaria.set('role', 'portaria')
    portaria.set('status', 'Ativo')
    app.save(portaria)
  }

  const parcelsCol = app.findCollectionByNameOrId('parcels')

  try {
    app.findFirstRecordByData('parcels', 'tracking_code', 'TRK001')
  } catch (_) {
    const p = new Record(parcelsCol)
    p.set('tracking_code', 'TRK001')
    p.set('unit_id', units[0].id)
    p.set('resident_id', residents[0].id)
    p.set('carrier', 'Correios')
    p.set('status', 'ENTRADA_PORTARIA')
    p.set('volumes', 1)
    p.set('porter_id', portaria.id)
    app.save(p)
  }

  try {
    app.findFirstRecordByData('parcels', 'tracking_code', 'TRK002')
  } catch (_) {
    const p = new Record(parcelsCol)
    p.set('tracking_code', 'TRK002')
    p.set('unit_id', units[1].id)
    p.set('resident_id', residents[1].id)
    p.set('carrier', 'Mercado Livre')
    p.set('status', 'EM_TRIAGEM')
    p.set('volumes', 1)
    p.set('porter_id', portaria.id)
    app.save(p)
  }

  try {
    app.findFirstRecordByData('parcels', 'tracking_code', 'TRK003')
  } catch (_) {
    const p = new Record(parcelsCol)
    p.set('tracking_code', 'TRK003')
    p.set('unit_id', units[2].id)
    p.set('resident_id', residents[2].id)
    p.set('carrier', 'Amazon')
    p.set('status', 'LIBERADO_RETIRADA')
    p.set('volumes', 2)
    p.set('volume_type', 'Caixa Média')
    p.set('shelf_location', 'Prateleira A - Nível 1')
    p.set('withdrawal_code', '123456')
    p.set('porter_id', portaria.id)
    app.save(p)
  }
})
