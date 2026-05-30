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

  const token = body.token
  if (!token) {
    return e.forbiddenError('Token de convite obrigatório para auto-cadastro.')
  }

  const now = new Date().toISOString()
  const links = $app.findRecordsByFilter(
    'invitation_links',
    'token = {:token} && used = false && expires_at > {:now}',
    '-created',
    1,
    0,
    { token: token, now: now },
  )

  if (links.length === 0) {
    return e.forbiddenError('Token de convite inválido ou expirado.')
  }

  const link = links[0]
  if (link.get('unit_id') !== body.unit_id) {
    return e.forbiddenError('A unidade selecionada não corresponde ao convite.')
  }

  return e.next()
}, 'users')
