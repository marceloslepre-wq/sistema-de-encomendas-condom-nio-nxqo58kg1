routerAdd('POST', '/backend/v1/public/onboarding', (e) => {
  const body = e.requestInfo().body || {}
  const razaoSocial = (body.razaoSocial || body.nome || '').trim()
  const cnpj = (body.cnpj || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const cidade = (body.cidade || '').trim()
  const estado = (body.estado || '').trim()
  const responsavel = (body.responsavel || body.name || '').trim()
  const planoId = (body.planoId || '').trim()

  // Validações obrigatórias
  if (!razaoSocial) {
    return e.badRequestError('A Razão Social do condomínio / empresa é obrigatória.')
  }
  if (!cnpj) {
    return e.badRequestError('O CNPJ é obrigatório.')
  }
  if (!email || !email.includes('@')) {
    return e.badRequestError('E-mail corporativo válido é obrigatório.')
  }
  if (!cidade) {
    return e.badRequestError('A Cidade é obrigatória.')
  }
  if (!estado) {
    return e.badRequestError('O Estado é obrigatório.')
  }

  // Verificar se o e-mail já existe na base de usuários
  try {
    const existingUser = $app.findAuthRecordByEmail('users', email)
    if (existingUser) {
      return e.badRequestError(
        'Este e-mail corporativo já está cadastrado no sistema. Por favor, utilize outro e-mail ou faça login.',
      )
    }
  } catch (_) {
    // Ok se não encontrar
  }

  // Resolver plano selecionado (se não informado, buscar o primeiro plano ativo)
  let selectedPlano = null
  if (planoId) {
    try {
      selectedPlano = $app.findRecordById('planos', planoId)
    } catch (_) {
      try {
        selectedPlano = $app.findFirstRecordByData('planos', 'nome', planoId)
      } catch (_) {}
    }
  }

  if (!selectedPlano) {
    try {
      const activePlans = $app.findRecordsByFilter(
        'planos',
        "status = 'ativo'",
        'preco_mensal',
        1,
        0,
      )
      if (activePlans.length > 0) {
        selectedPlano = activePlans[0]
      }
    } catch (_) {}
  }

  if (!selectedPlano) {
    return e.badRequestError('Nenhum plano ativo foi encontrado para vincular ao teste grátis.')
  }

  // Gerar senha provisória aleatória amigável e segura (ex: Cond@8caracteres)
  const provisionalPassword = 'Cnd@' + $security.randomString(6)

  // Calcular data de expiração (15 dias a partir de hoje às 23:59:59)
  const now = new Date()
  const expirationDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  const expirationISO = expirationDate.toISOString()

  let createdCondoId = ''
  let createdLicencaId = ''
  let createdUserId = ''

  try {
    $app.runInTransaction((txApp) => {
      // 1. Criar o condomínio
      const condosCol = txApp.findCollectionByNameOrId('condos')
      const condoRecord = new Record(condosCol)
      condoRecord.set('name', razaoSocial)
      condoRecord.set('cnpj', cnpj)
      condoRecord.set('address', cidade + (estado ? ' - ' + estado : ''))
      condoRecord.set('phone', body.phone || '')
      txApp.save(condoRecord)
      createdCondoId = condoRecord.id

      // 2. Criar a licença de trial de 15 dias vinculada ao condomínio e ao plano
      const licencasCol = txApp.findCollectionByNameOrId('licencas')
      const licencaRecord = new Record(licencasCol)
      licencaRecord.set('condo_id', createdCondoId)
      licencaRecord.set('plano_id', selectedPlano.id)
      licencaRecord.set('status', 'ativa')
      licencaRecord.set('data_expiracao', expirationISO)
      txApp.save(licencaRecord)
      createdLicencaId = licencaRecord.id

      // 3. Criar usuário Gestor
      const usersCol = txApp.findCollectionByNameOrId('users')
      const userRecord = new Record(usersCol)
      userRecord.set('name', responsavel || razaoSocial)
      userRecord.setEmail(email)
      userRecord.setPassword(provisionalPassword)
      userRecord.setVerified(true)
      userRecord.set('role', 'gestor')
      userRecord.set('condo_id', createdCondoId)
      if (body.phone) {
        userRecord.set('phone', body.phone)
      }
      txApp.save(userRecord)
      createdUserId = userRecord.id
    })

    return e.json(200, {
      success: true,
      condo: {
        id: createdCondoId,
        name: razaoSocial,
        cnpj: cnpj,
        cidade: cidade,
        estado: estado,
      },
      plano: {
        id: selectedPlano.id,
        nome: selectedPlano.getString('nome'),
        preco_mensal: selectedPlano.getInt('preco_mensal'),
      },
      licenca: {
        id: createdLicencaId,
        status: 'ativa',
        data_expiracao: expirationISO,
        dias_trial: 15,
      },
      gestor: {
        id: createdUserId,
        email: email,
        senha_provisoria: provisionalPassword,
        role: 'gestor',
      },
    })
  } catch (err) {
    return e.badRequestError(
      'Erro ao processar cadastro: ' + (err.message || 'Falha na transação.'),
    )
  }
})
