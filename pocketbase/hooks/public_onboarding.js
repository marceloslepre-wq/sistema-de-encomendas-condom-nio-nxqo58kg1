routerAdd('POST', '/backend/v1/public/onboarding', (e) => {
  const body = e.requestInfo().body || {}
  const razaoSocial = (body.razaoSocial || body.nome || '').trim()
  const cnpj = (body.cnpj || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const cidade = (body.cidade || '').trim()
  const estado = (body.estado || '').trim()
  const responsavel = (body.responsavel || body.name || '').trim()
  const phone = (body.phone || body.whatsapp || '').trim()
  const planoId = (body.planoId || '').trim()
  const password = (body.password || '').trim()

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

  const phoneDigits = phone.replace(/\D/g, '')
  if (!phone || phoneDigits.length < 10) {
    return e.badRequestError(
      'O Whatsapp para envio de mensagens é obrigatório e deve ter formato válido.',
    )
  }

  // Validação da senha definida pelo próprio gestor (mínimo 8 caracteres)
  if (!password || password.length < 8) {
    return e.badRequestError('A senha de acesso do Gestor deve conter no mínimo 8 caracteres.')
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
        "status = 'ativo' && (exclusivo_master = false || exclusivo_master = null)",
        'preco_mensal',
        1,
        0,
      )
      if (activePlans.length > 0) {
        selectedPlano = activePlans[0]
      }
    } catch (_) {}
  }

  // Se o plano selecionado for exclusivo_master, impedir cadastro público por ele
  if (
    selectedPlano &&
    (selectedPlano.getBool('exclusivo_master') ||
      selectedPlano.getString('nome') === 'Plano no Master')
  ) {
    return e.badRequestError('O plano selecionado não está disponível para contratação pública.')
  }

  if (!selectedPlano) {
    return e.badRequestError('Nenhum plano ativo foi encontrado para vincular ao teste grátis.')
  }

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
      condoRecord.set('email', email)
      condoRecord.set('cidade', cidade)
      condoRecord.set('estado', estado)
      condoRecord.set('responsavel', responsavel)
      condoRecord.set('address', cidade + (estado ? ' - ' + estado : ''))
      condoRecord.set('phone', phone)
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

      // 3. Criar usuário Gestor com a senha escolhida por ele
      const usersCol = txApp.findCollectionByNameOrId('users')
      const userRecord = new Record(usersCol)
      userRecord.set('name', responsavel || razaoSocial)
      userRecord.setEmail(email)
      userRecord.setPassword(password)
      userRecord.setVerified(true)
      userRecord.set('role', 'gestor')
      userRecord.set('condo_id', createdCondoId)
      if (phone) {
        userRecord.set('phone', phone)
      }
      txApp.save(userRecord)
      createdUserId = userRecord.id
    })

    // Disparo imediato para a Sholver (Onboarding / Novo Pedido Trial)
    try {
      const sholverSecret =
        $os.getenv('SHOLVER_WEBHOOK_SECRET') ||
        ($secrets.has && $secrets.has('SHOLVER_WEBHOOK_SECRET')
          ? $secrets.get('SHOLVER_WEBHOOK_SECRET')
          : '')
      if (sholverSecret) {
        let sholverEndereco = ''
        if (cidade || estado) {
          sholverEndereco = [cidade, estado].filter(Boolean).join('/')
        }

        const sholverPayload = {
          numero_pedido: `COND-2026-${createdLicencaId}`,
          cliente: {
            razao_social: razaoSocial,
            nome_fantasia: responsavel || razaoSocial,
            email: email,
            telefone: phone,
            whatsapp: phone,
            documento: cnpj,
            endereco: sholverEndereco,
          },
          plano: {
            nome: selectedPlano.getString('nome') || 'Plano',
          },
          produto: 'Condpack',
          valor: Number(selectedPlano.getInt('preco_mensal') || 0),
          metodo_pagamento: 'TRIAL',
          status: 'trial_ativo',
        }

        const sholverRes = $http.send({
          url: 'https://plataforma-skip-apps-98eed.shrd00.internal.goskip.dev/backend/v1/webhook/condpack',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sholver-Secret': sholverSecret,
            'X-API-Key': sholverSecret,
          },
          body: JSON.stringify(sholverPayload),
          timeout: 20,
        })

        const sStatus = sholverRes ? sholverRes.statusCode : 0
        let sRaw = ''
        if (sholverRes && sholverRes.raw) sRaw = String(sholverRes.raw)
        else if (sholverRes && sholverRes.body) {
          try {
            sRaw = new TextDecoder().decode(sholverRes.body)
          } catch (_) {
            sRaw = String(sholverRes.body)
          }
        }
        let sJson = null
        try {
          sJson = JSON.parse(sRaw)
        } catch (_) {
          sJson = { raw: sRaw }
        }

        const sLogCol = $app.findCollectionByNameOrId('sholver_sync_logs')
        const sLogRec = new Record(sLogCol)
        sLogRec.set('numero_pedido', sholverPayload.numero_pedido)
        if (createdCondoId) sLogRec.set('condo_id', createdCondoId)
        if (createdLicencaId) sLogRec.set('licenca_id', createdLicencaId)
        if (selectedPlano) sLogRec.set('plano_id', selectedPlano.id)
        sLogRec.set('evento', 'public_onboarding_trial')
        sLogRec.set('status_pedido', 'trial_ativo')
        sLogRec.set('metodo_pagamento', 'TRIAL')
        sLogRec.set('valor', Number(selectedPlano.getInt('preco_mensal') || 0))
        sLogRec.set('http_status', sStatus)
        sLogRec.set('sucesso', sStatus >= 200 && sStatus < 300)
        sLogRec.set('request_payload', sholverPayload)
        sLogRec.set('response_body', sJson)
        if (sStatus < 200 || sStatus >= 300) {
          sLogRec.set('error', `HTTP ${sStatus}: ${sRaw.substring(0, 300)}`)
        }
        $app.saveNoValidate(sLogRec)
      }
    } catch (sholverErr) {
      $app
        .logger()
        .error(
          'Erro ao sincronizar com Sholver no public onboarding:',
          'error',
          sholverErr.message || sholverErr,
        )
    }

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
        role: 'gestor',
      },
    })
  } catch (err) {
    return e.badRequestError(
      'Erro ao processar cadastro: ' + (err.message || 'Falha na transação.'),
    )
  }
})
