routerAdd(
  'PATCH',
  '/backend/v1/admin/users/{id}',
  (e) => {
    const auth = e.auth
    const id = e.request.pathValue('id')

    if (!auth) {
      throw new UnauthorizedError('Acesso negado.')
    }

    const isGestor = auth.getString('role') === 'gestor' || auth.getString('role') === 'admin'
    const isSelf = auth.id === id

    if (!isGestor && !isSelf) {
      throw new ForbiddenError(
        'Acesso negado. Apenas gestores ou o próprio usuário podem realizar esta ação.',
      )
    }
    let record
    try {
      record = $app.findRecordById('users', id)
    } catch (err) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    let body = e.requestInfo().body || {}
    const errors = {}

    if (!isGestor) {
      delete body.role
      delete body.cpf
      delete body.torre
      delete body.unidade
    }

    const targetRole = body.role !== undefined ? body.role : record.getString('role')

    if (targetRole !== 'morador') {
      body.cpf = ''
      body.torre = ''
      body.unidade = ''
    } else if (isGestor) {
      const finalCpf = body.cpf !== undefined ? body.cpf : record.getString('cpf')
      const finalTorre = body.torre !== undefined ? body.torre : record.getString('torre')
      const finalUnidade = body.unidade !== undefined ? body.unidade : record.getString('unidade')

      if (!finalCpf || String(finalCpf).trim() === '') {
        errors.cpf = new ValidationError(
          'validation_required',
          'O CPF é obrigatório para moradores.',
        )
      }
      if (!finalTorre || String(finalTorre).trim() === '') {
        errors.torre = new ValidationError(
          'validation_required',
          'A Torre é obrigatória para moradores.',
        )
      }
      if (!finalUnidade || String(finalUnidade).trim() === '') {
        errors.unidade = new ValidationError(
          'validation_required',
          'A Unidade é obrigatória para moradores.',
        )
      }
    }

    if (body.email !== undefined && body.email !== '' && body.email !== record.getString('email')) {
      try {
        const existing = $app.findAuthRecordByEmail('users', body.email)
        if (existing && existing.id !== record.id) {
          errors.email = new ValidationError('validation_not_unique', 'Este e-mail já está em uso.')
        }
      } catch (err) {
        // Not found, which is fine
      }
    }

    if (body.cpf !== undefined && body.cpf !== '' && body.cpf !== record.getString('cpf')) {
      try {
        const existing = $app.findFirstRecordByData('users', 'cpf', body.cpf)
        if (existing && existing.id !== record.id) {
          errors.cpf = new ValidationError('validation_not_unique', 'Este CPF já está em uso.')
        }
      } catch (err) {
        // Not found, which is fine
      }
    }

    if (body.password !== undefined && String(body.password).trim() !== '') {
      if (body.passwordConfirm === undefined || String(body.passwordConfirm).trim() === '') {
        errors.passwordConfirm = new ValidationError(
          'validation_required',
          'A confirmação de senha é obrigatória.',
        )
      } else if (String(body.password) !== String(body.passwordConfirm)) {
        errors.passwordConfirm = new ValidationError(
          'validation_mismatch',
          'As senhas não coincidem.',
        )
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Dados inválidos.', errors)
    }

    const allowedFields = ['name', 'phone', 'role', 'cpf', 'torre', 'unidade']

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        record.set(field, body[field] === null ? '' : String(body[field]))
      }
    }

    if (body.permitir_retirada_terceiros !== undefined) {
      record.set('permitir_retirada_terceiros', Boolean(body.permitir_retirada_terceiros))
    }

    if (body.email !== undefined && body.email !== '') {
      record.setEmail(body.email)
    }

    if (
      body.password &&
      String(body.password).trim() !== '' &&
      body.password === body.passwordConfirm
    ) {
      record.setPassword(String(body.password))
    }

    try {
      $app.save(record)
    } catch (err) {
      const msg = String(err.message || '')
      if (msg.includes('UNIQUE constraint failed')) {
        throw new BadRequestError('Dados já cadastrados.', {
          form: new ValidationError(
            'validation_not_unique',
            'Algum dado único (como e-mail, CPF ou telefone) já está em uso por outro usuário.',
          ),
        })
      }
      throw err
    }

    return e.json(200, record)
  },
  $apis.requireAuth(),
)
