onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()

  const auth = e.auth
  const role = auth ? auth.getString('role') : ''
  if (auth && (role === 'gestor' || role === 'master' || role === 'admin')) {
    return e.next()
  }

  const body = e.requestInfo().body
  if (body.role !== 'morador') {
    return e.forbiddenError('Apenas gestores podem criar contas com este perfil.')
  }

  // Token is no longer required for direct 'morador' registration flow.
  return e.next()
}, 'users')
