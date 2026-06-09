routerAdd('GET', '/backend/v1/invitations/{token}', (e) => {
  const token = e.request.pathValue('token')
  try {
    const record = $app.findFirstRecordByData('invitation_links', 'token', token)
    if (!record.getBool('active')) {
      return e.notFoundError('Link inativo')
    }
    return e.json(200, {
      id: record.id,
      role: record.getString('role'),
      torre: record.getString('torre'),
      unidade: record.getString('unidade'),
      token: record.getString('token'),
    })
  } catch (_) {
    return e.notFoundError('Link inválido')
  }
})
