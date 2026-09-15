routerAdd('GET', '/backend/v1/invitations/{token}', (e) => {
  const token = e.request.pathValue('token')
  try {
    const record = $app.findFirstRecordByData('invitation_links', 'token', token)
    if (!record.getBool('active')) {
      return e.notFoundError('Link inativo')
    }

    const condoId = record.getString('condo_id')
    let unitsList = []
    let condoName = ''

    if (condoId) {
      try {
        const condoRecord = $app.findRecordById('condos', condoId)
        condoName = condoRecord.getString('name')
      } catch (_) {}

      try {
        const units = $app.findRecordsByFilter(
          'units',
          'condo_id = {:condoId}',
          'tower,apartment',
          10000,
          0,
          { condoId: condoId },
        )
        unitsList = units.map((u) => ({
          id: u.id,
          tower: u.getString('tower'),
          apartment: u.getString('apartment'),
        }))
      } catch (_) {}
    }

    return e.json(200, {
      id: record.id,
      role: record.getString('role'),
      torre: record.getString('torre'),
      unidade: record.getString('unidade'),
      token: record.getString('token'),
      condo_id: condoId,
      condo_name: condoName,
      units: unitsList,
    })
  } catch (_) {
    return e.notFoundError('Link inválido')
  }
})
