routerAdd(
  'PATCH',
  '/backend/v1/admin/users/{id}',
  (e) => {
    const auth = e.auth
    if (!auth || auth.getString('role') !== 'gestor') {
      return e.forbiddenError('Acesso negado. Apenas gestores podem realizar esta ação.')
    }

    const id = e.request.pathValue('id')
    const record = $app.findRecordById('users', id)
    const body = e.requestInfo().body || {}

    const allowedFields = [
      'name',
      'cpf',
      'phone',
      'role',
      'status',
      'unit_id',
      'autoriza_retirada_terceiros',
      'avatar',
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
      record.setPassword(String(body.password))
    }

    const avatarFiles = e.findUploadedFiles('avatar')
    if (avatarFiles && avatarFiles.length > 0) {
      record.set('avatar', avatarFiles[0])
    }

    $app.save(record)
    return e.json(200, record)
  },
  $apis.requireAuth(),
)
