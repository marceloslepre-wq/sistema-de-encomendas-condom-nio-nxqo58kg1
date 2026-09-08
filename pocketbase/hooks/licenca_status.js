// Endpoint seguro para consultar o status da licença do usuário autenticado (ou marcar como expirada se vencida)
routerAdd('GET', '/backend/v1/licenca/status', (e) => {
  const auth = e.requestInfo().authRecord
  if (!auth) {
    return e.forbiddenError('Não autenticado.')
  }

  const role = auth.getString('role')
  if (role === 'master' || role === 'admin') {
    return e.json(200, {
      bloqueado: false,
      status: 'ativa',
      role: role,
      master: true,
      data_expiracao: null,
      dias_restantes: 9999,
    })
  }

  const condoId = auth.getString('condo_id')
  if (!condoId) {
    return e.json(200, {
      bloqueado: false,
      status: 'ativa',
      role: role,
      sem_condo: true,
    })
  }

  try {
    const licencas = $app.findRecordsByFilter('licencas', `condo_id = '${condoId}'`, '-created', 1)

    if (licencas.length === 0) {
      return e.json(200, {
        bloqueado: false,
        status: 'ativa',
        role: role,
        observacao: 'Nenhuma licença encontrada.',
      })
    }

    const lic = licencas[0]
    let status = lic.getString('status')
    const expStr = lic.getString('data_expiracao')
    const now = new Date()

    let isExpiradaPorData = false
    let diasRestantes = null

    if (expStr) {
      const expDate = new Date(expStr)
      const diffMs = expDate.getTime() - now.getTime()
      diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (diffMs <= 0) {
        isExpiradaPorData = true
        if (status === 'ativa') {
          // Atualiza no banco para 'expirada'
          lic.set('status', 'expirada')
          try {
            $app.saveNoValidate(lic)
          } catch (_) {}
          status = 'expirada'
        }
      }
    }

    const bloqueado =
      status === 'expirada' || status === 'pausada' || status === 'cancelada' || isExpiradaPorData

    // Buscar dados do plano para caso precise de renovação
    let planoData = null
    const planoId = lic.getString('plano_id')
    if (planoId) {
      try {
        const plano = $app.findRecordById('planos', planoId)
        planoData = {
          id: plano.id,
          nome: plano.getString('nome'),
          preco_mensal: plano.getInt('preco_mensal'),
          descricao: plano.getString('descricao'),
        }
      } catch (_) {}
    }

    // Buscar condomínio
    let condoName = ''
    try {
      const condo = $app.findRecordById('condos', condoId)
      condoName = condo.getString('name')
    } catch (_) {}

    return e.json(200, {
      bloqueado: bloqueado,
      status: status,
      data_expiracao: expStr,
      dias_restantes: diasRestantes,
      licenca_id: lic.id,
      condo_id: condoId,
      condo_name: condoName,
      plano: planoData,
      role: role,
    })
  } catch (err) {
    return e.badRequestError('Erro ao consultar licença: ' + (err.message || err))
  }
})
