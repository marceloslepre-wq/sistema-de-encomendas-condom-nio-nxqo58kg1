routerAdd('POST', '/backend/v1/invitations/{token}/register', (e) => {
  const token = e.request.pathValue('token')
  const body = e.requestInfo().body

  let inv
  try {
    inv = $app.findFirstRecordByData('invitation_links', 'token', token)
  } catch (_) {
    return e.notFoundError('Link inválido')
  }

  if (!inv.getBool('active')) {
    return e.badRequestError('Link inativo')
  }

  const role = inv.getString('role')
  const invTorre = inv.getString('torre')
  const invUnidade = inv.getString('unidade')
  const invCondoId = inv.getString('condo_id')

  if (!body.name || !body.email || !body.password) {
    return e.badRequestError('Nome, e-mail e senha são obrigatórios.')
  }

  if (role === 'morador') {
    if (!body.cpf) return e.badRequestError('CPF é obrigatório.')
    if (!invTorre && !body.torre) return e.badRequestError('Torre é obrigatória.')
    if (!invUnidade && !body.unidade) return e.badRequestError('Unidade é obrigatória.')
  }

  try {
    $app.runInTransaction((txApp) => {
      const usersCol = txApp.findCollectionByNameOrId('users')
      const user = new Record(usersCol)
      user.set('role', role)
      user.set('name', body.name)
      user.setEmail(body.email)
      user.setPassword(body.password)
      user.setVerified(true)
      if (body.phone) user.set('phone', body.phone)

      const finalTorre = role === 'morador' ? invTorre || body.torre : ''
      const finalUnidade = role === 'morador' ? invUnidade || body.unidade : ''
      const finalCpf = role === 'morador' ? body.cpf : ''

      if (invCondoId) {
        user.set('condo_id', invCondoId)
      }

      if (role === 'morador') {
        user.set('cpf', finalCpf)
        user.set('torre', finalTorre)
        user.set('unidade', finalUnidade)
      }

      txApp.save(user)

      if (role === 'morador') {
        const moradorCol = txApp.findCollectionByNameOrId('moradores')
        const morador = new Record(moradorCol)
        morador.set('nome', body.name)
        morador.set('email', body.email)
        morador.set('cpf', finalCpf)
        morador.set('torre', finalTorre)
        morador.set('apartamento', finalUnidade)
        morador.set('telefone', body.phone || '')
        if (invCondoId) {
          morador.set('condo_id', invCondoId)
        }
        txApp.save(morador)
      }
    })
  } catch (err) {
    return e.badRequestError('Erro ao registrar. Verifique se o e-mail ou CPF já estão em uso.')
  }

  return e.json(200, { success: true })
})
