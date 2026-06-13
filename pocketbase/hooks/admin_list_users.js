routerAdd('GET', '/backend/v1/admin/users', (e) => {
  const auth = e.auth
  if (!auth || (auth.getString('role') !== 'gestor' && auth.getString('role') !== 'admin')) {
    return e.forbiddenError('Acesso negado')
  }

  // Find all users (limit to a large number to ensure we get all records)
  const users = $app.findRecordsByFilter('users', '1=1', '-created', 10000, 0)

  const result = []
  for (const u of users) {
    result.push({
      id: u.id,
      name: u.getString('name'),
      email: u.email(),
      role: u.getString('role'),
      phone: u.getString('phone'),
      cpf: u.getString('cpf'),
      torre: u.getString('torre'),
      unidade: u.getString('unidade'),
      created: u.getDateTime('created').string(),
      updated: u.getDateTime('updated').string(),
    })
  }

  return e.json(200, result)
})
