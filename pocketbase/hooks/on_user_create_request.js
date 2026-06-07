onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()

  const auth = e.auth
  if (auth && auth.get('role') === 'gestor') {
    return e.next()
  }

  const body = e.requestInfo().body
  if (body.role !== 'morador') {
    return e.forbiddenError('Apenas gestores podem criar contas com este perfil.')
  }

  // Token is no longer required for direct 'morador' registration flow.
  return e.next()
}, 'users')
