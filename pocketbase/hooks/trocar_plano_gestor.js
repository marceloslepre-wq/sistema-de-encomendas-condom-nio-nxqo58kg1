// Endpoint para gestor trocar de plano do condomínio (upgrade ou downgrade)
// Sem restrição de valor/porte — liberado para qualquer plano ativo que não seja exclusivo_master
// Mantém número/id da licença e data de expiração atuais
// Registra o evento na coleção historico_licencas
routerAdd(
  'POST',
  '/backend/v1/licenca/trocar-plano',
  (e) => {
    let auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        const rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        const token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const role = auth.getString('role')
    if (role !== 'gestor' && role !== 'master' && role !== 'admin') {
      return e.forbiddenError('Apenas gestores ou administradores podem alterar o plano.')
    }

    const condoId = auth.getString('condo_id')
    if (!condoId) {
      return e.badRequestError('Nenhum condomínio vinculado a esta conta.')
    }

    const body = e.requestInfo().body || {}
    const novoPlanoId = body.plano_id
    if (!novoPlanoId) {
      return e.badRequestError('O ID do novo plano é obrigatório.')
    }

    // Buscar novo plano
    let novoPlano = null
    try {
      novoPlano = $app.findRecordById('planos', novoPlanoId)
    } catch (_) {
      return e.notFoundError('Plano selecionado não encontrado.')
    }

    if (novoPlano.getString('status') !== 'ativo') {
      return e.badRequestError('O plano selecionado não está ativo.')
    }

    // Não permitir que clientes selecionem plano exclusivo master
    if (role !== 'master' && role !== 'admin') {
      if (
        novoPlano.getBool('exclusivo_master') ||
        novoPlano.getString('nome') === 'Plano no Master'
      ) {
        return e.forbiddenError('Este plano é de uso exclusivo da administração master.')
      }
    }

    // Buscar licença atual do condomínio
    const licencas = $app.findRecordsByFilter(
      'licencas',
      `condo_id = '${condoId}'`,
      '-created',
      1,
      0,
    )

    if (!licencas || licencas.length === 0) {
      return e.notFoundError('Licença do condomínio não encontrada.')
    }

    const lic = licencas[0]
    const planoAntigoId = lic.getString('plano_id')
    let planoAntigoNome = 'Plano Anterior'
    if (planoAntigoId) {
      try {
        const pAntigo = $app.findRecordById('planos', planoAntigoId)
        planoAntigoNome = pAntigo.getString('nome')
      } catch (_) {}
    }

    const novoPlanoNome = novoPlano.getString('nome')

    // Atualizar a licença apontando para o novo plano mantendo id e data_expiracao
    lic.set('plano_id', novoPlano.id)
    $app.save(lic)

    // Registrar a mudança no histórico de licenças
    try {
      const histCol = $app.findCollectionByNameOrId('historico_licencas')
      const hist = new Record(histCol)
      hist.set('condo_id', condoId)
      hist.set('licenca_id', lic.id)
      hist.set('plano_id', novoPlano.id)
      hist.set('tipo_evento', 'troca_plano')
      hist.set('plano_nome', novoPlanoNome)
      hist.set('data_expiracao', lic.getString('data_expiracao'))
      hist.set(
        'descricao',
        `Alteração de plano realizada: de "${planoAntigoNome}" para "${novoPlanoNome}"`,
      )
      hist.set('alterado_por', auth.getString('name') || auth.getString('email') || 'Gestor')
      $app.save(hist)
    } catch (errHist) {
      $app
        .logger()
        .error(
          'Erro ao registrar histórico de troca de plano:',
          'error',
          errHist.message || errHist,
        )
    }

    // Sincronizar alteração de plano com a plataforma Sholver
    try {
      const sholverSecret =
        $os.getenv('SHOLVER_WEBHOOK_SECRET') ||
        ($secrets.has && $secrets.has('SHOLVER_WEBHOOK_SECRET')
          ? $secrets.get('SHOLVER_WEBHOOK_SECRET')
          : '')
      if (sholverSecret) {
        let sholverCondo = null
        try {
          sholverCondo = $app.findRecordById('condos', condoId)
        } catch (_) {}

        const precoNovo = Number(novoPlano.getInt('preco_mensal') || 0)
        const sholverPayload = {
          numero_pedido: `COND-2026-${lic.id}`,
          cliente: {
            razao_social: (sholverCondo ? sholverCondo.getString('name') : '') || 'Condomínio',
            nome_fantasia:
              (sholverCondo
                ? sholverCondo.getString('responsavel') || sholverCondo.getString('name')
                : '') || 'Condomínio',
            email:
              (sholverCondo ? sholverCondo.getString('email') : '') || 'contato@condominio.com.br',
            telefone:
              (sholverCondo
                ? sholverCondo.getString('phone') || sholverCondo.getString('whatsapp_phone')
                : '') || '',
            documento: (sholverCondo ? sholverCondo.getString('cnpj') : '') || '',
          },
          plano: {
            nome: novoPlanoNome,
          },
          produto: 'Condpack',
          valor: precoNovo,
          metodo_pagamento: 'PIX',
          status: 'pago',
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
        if (condoId) sLogRec.set('condo_id', condoId)
        if (lic) sLogRec.set('licenca_id', lic.id)
        if (novoPlano) sLogRec.set('plano_id', novoPlano.id)
        sLogRec.set('evento', 'troca_plano_gestor')
        sLogRec.set('status_pedido', 'pago')
        sLogRec.set('metodo_pagamento', 'PIX')
        sLogRec.set('valor', precoNovo)
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
          'Erro ao sincronizar troca de plano com Sholver:',
          'error',
          sholverErr.message || sholverErr,
        )
    }

    return e.json(200, {
      success: true,
      message: `Plano alterado com sucesso para ${novoPlanoNome}.`,
      licenca_id: lic.id,
      plano_id: novoPlano.id,
      plano_nome: novoPlanoNome,
      data_expiracao: lic.getString('data_expiracao'),
    })
  },
  $apis.requireAuth(),
)
