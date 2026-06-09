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
    const errors = {}

    if (body.email !== undefined && body.email !== '' && body.email !== record.email()) {
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

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Dados inválidos.', errors)
    }

    const allowedFields = ['name', 'phone', 'role', 'cpf', 'torre', 'unidade']

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        record.set(field, body[field])
      }
    }

    if (body.email !== undefined && body.email !== '') {
      record.setEmail(body.email)
    }

    if (body.password && String(body.password).trim() !== '') {
      record.setPassword(String(body.password))
    }

    const avatarFiles = e.findUploadedFiles('avatar')
    if (avatarFiles && avatarFiles.length > 0) {
      record.set('avatar', avatarFiles[0])
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
