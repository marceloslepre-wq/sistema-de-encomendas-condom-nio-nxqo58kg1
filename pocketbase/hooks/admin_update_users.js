routerAdd(
  'PATCH',
  '/backend/v1/admin/users/{id}',
  (e) => {
    const auth = e.auth
    if (!auth || auth.getString('role') !== 'gestor') {
      throw new ForbiddenError('Acesso negado. Apenas gestores podem realizar esta ação.')
    }

    const id = e.request.pathValue('id')
    let record
    try {
      record = $app.findRecordById('users', id)
    } catch (err) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    let body = e.requestInfo().body || {}

    if (body.email !== undefined && body.email !== record.email()) {
      try {
        const existing = $app.findAuthRecordByEmail('users', body.email)
        if (existing && existing.id !== record.id) {
          throw new BadRequestError('E-mail já cadastrado.', {
            email: new ValidationError('validation_not_unique', 'Este e-mail já está em uso.'),
          })
        }
      } catch (err) {
        if (err instanceof BadRequestError) throw err
      }
    }

    if (body.cpf !== undefined && body.cpf !== record.getString('cpf') && body.cpf !== '') {
      try {
        const existing = $app.findFirstRecordByData('users', 'cpf', body.cpf)
        if (existing && existing.id !== record.id) {
          throw new BadRequestError('CPF já cadastrado.', {
            cpf: new ValidationError('validation_not_unique', 'Este CPF já está em uso.'),
          })
        }
      } catch (err) {
        if (err instanceof BadRequestError) throw err
      }
    }

    const allowedFields = [
      'name',
      'cpf',
      'phone',
      'role',
      'status',
      'unit_id',
      'autoriza_retirada_terceiros',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        record.set(field, body[field])
      }
    }

    if (body.email !== undefined) {
      record.setEmail(body.email)
    }

    if (body.password && String(body.password).trim() !== '') {
      if (body.passwordConfirm && body.password !== body.passwordConfirm) {
        throw new BadRequestError('As senhas não coincidem.', {
          passwordConfirm: new ValidationError(
            'validation_password_mismatch',
            'As senhas não coincidem.',
          ),
        })
      }
      record.setPassword(String(body.password))
    }

    const avatarFiles = e.findUploadedFiles('avatar')
    if (avatarFiles && avatarFiles.length > 0) {
      record.set('avatar', avatarFiles[0])
    }

    try {
      $app.save(record)
      return e.json(200, record)
    } catch (err) {
      throw new BadRequestError(
        'Erro de validação ao salvar o usuário. Verifique os dados informados.',
        {
          geral: new ValidationError('validation_error', err.message || 'Erro de processamento.'),
        },
      )
    }
  },
  $apis.requireAuth(),
)
