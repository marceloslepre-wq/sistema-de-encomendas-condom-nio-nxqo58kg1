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

// Validação antecipada de duplicidade de e-mail e CPF e obrigatoriedade de campos
// para evitar retorno 400 genérico sem detalhes ao frontend
onRecordCreateRequest((e) => {
  const record = e.record
  const email = (record.getString('email') || '').trim()
  const cpf = (record.getString('cpf') || '').trim()
  const role = record.getString('role') || ''
  const errors = {}

  if (email) {
    try {
      const existing = $app.findAuthRecordByEmail('users', email)
      if (existing) {
        errors.email = new ValidationError(
          'validation_not_unique',
          'Já existe um usuário com este e-mail.',
        )
      }
    } catch (_) {}
  }

  if (cpf) {
    try {
      const existingCpf = $app.findFirstRecordByData('users', 'cpf', cpf)
      if (existingCpf) {
        errors.cpf = new ValidationError(
          'validation_not_unique',
          'Já existe um usuário com este CPF.',
        )
      }
    } catch (_) {}
  }

  if (role === 'morador') {
    if (!cpf) {
      errors.cpf = new ValidationError('validation_required', 'O CPF é obrigatório para moradores.')
    }
    if (!record.getString('torre')) {
      errors.torre = new ValidationError(
        'validation_required',
        'A Torre é obrigatória para moradores.',
      )
    }
    if (!record.getString('unidade')) {
      errors.unidade = new ValidationError(
        'validation_required',
        'A Unidade é obrigatória para moradores.',
      )
    }
  }

  if (Object.keys(errors).length > 0) {
    return e.badRequestError('Dados inválidos para cadastro de usuário.', errors)
  }

  return e.next()
}, 'users')
