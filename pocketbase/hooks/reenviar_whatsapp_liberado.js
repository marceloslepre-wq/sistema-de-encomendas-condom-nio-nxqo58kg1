/**
 * REENVIO DE MENSAGEM "PROCESSADO E LIBERADO PARA RETIRADA"
 *
 * Rota: POST /backend/v1/reenviar-whatsapp-liberado
 * Corpo: { recebimento_id: string }
 *
 * Reenvia a mensagem do estágio "Processado e Liberado para Retirada"
 * (status LIBERADO_RETIRADA) ao morador, lendo o template em
 * templates_notificacao (mesma fonte dos hooks de notificação) e enviando
 * pela instância Evolution/WhatsApp do próprio condomínio.
 *
 * Reenvio puro de mensagem: NÃO muda status, NÃO grava historico_andamento,
 * NÃO dispara o webhook Sholver. Apenas registra os logs padrão de WhatsApp
 * (whatsapp_logs / notificacoes_enviadas) como as demais rotas.
 */
routerAdd(
  'POST',
  '/backend/v1/reenviar-whatsapp-liberado',
  (e) => {
    const body = e.requestInfo().body || {}
    const recebimentoId = String(body.recebimento_id || '')

    if (!recebimentoId) {
      return e.badRequestError('recebimento_id é obrigatório')
    }

    const recebimento = $app.findRecordById('recebimentos_auditoria', recebimentoId)
    const status = recebimento.getString('status')
    if (status !== 'LIBERADO_RETIRADA') {
      return e.badRequestError(
        'Esta encomenda não está liberada para retirada; não há mensagem para reenviar.',
      )
    }

    const condoId = recebimento.getString('condo_id')
    if (!condoId) {
      return e.badRequestError('Encomenda sem condomínio vinculado.')
    }

    // Acesso: gestor/portaria/triagem do próprio condomínio ou master/admin
    const auth = e.auth
    const role = auth ? auth.getString('role') : ''
    const isMaster = role === 'master' || role === 'admin'
    if (!isMaster && auth && auth.getString('condo_id') !== condoId) {
      return e.forbiddenError('Você não tem permissão para reenviar esta mensagem.')
    }

    // Morador: registro de MORADORES do condomínio (fonte do telefone),
    // casado por e-mail — mesma preferência da leitura da tela de retirada.
    let moradorName = recebimento.getString('morador') || ''
    let phone = ''
    const moradorRelId = recebimento.getString('morador_id')
    try {
      const usersCol = $app.findCollectionByNameOrId('users')
      let user = null
      if (moradorRelId) {
        try {
          user = $app.findRecordById(usersCol.id, moradorRelId)
        } catch (_) {}
      }
      if (!user && moradorName) {
        try {
          const found = $app.findRecordsByFilter(
            'users',
            "name ~ {:name} && role = 'morador' && condo_id = {:condoId}",
            '',
            1,
            0,
            { name: moradorName, condoId: condoId },
          )
          if (found.length > 0) user = found[0]
        } catch (_) {}
      }
      if (user) {
        if (!moradorName) moradorName = user.getString('name')
        phone = user.getString('phone') || ''
        try {
          const morCol = $app.findCollectionByNameOrId('moradores')
          const moradores = $app.findRecordsByFilter(
            morCol.id,
            'email = {:email} && condo_id = {:condoId}',
            '',
            1,
            0,
            { email: user.getString('email'), condoId: condoId },
          )
          if (moradores.length > 0) {
            const mor = moradores[0]
            const morPhone = (mor.getString('telefone') || '').trim()
            if (morPhone) phone = morPhone
            if (!moradorName) moradorName = mor.getString('nome') || ''
          }
        } catch (_) {}
      }
    } catch (_) {}

    if (!phone || !phone.replace(/\D/g, '')) {
      return e.badRequestError(
        'Morador sem telefone cadastrado. Atualize o cadastro para poder reenviar a mensagem.',
      )
    }

    // Template do estágio (mesma fonte dos hooks de notificação)
    const flowStage = 'Processado e Liberado para Retirada'
    let templateFilter = 'flow_stage = {:stage} && ativo = true'
    const templateBind = { stage: flowStage, condoId: condoId }
    templateFilter += ' && (condo_id = {:condoId} || condo_id = "" || condo_id = null)'
    const templates = $app.findRecordsByFilter(
      'templates_notificacao',
      templateFilter,
      '-created',
      1,
      0,
      templateBind,
    )
    if (templates.length === 0) {
      return e.badRequestError(
        'Nenhuma mensagem ativa configurada para o estágio "Processado e Liberado para Retirada".',
      )
    }

    const template = templates[0].getString('mensagem_template')

    let condoName = ''
    try {
      condoName = $app.findRecordById('condos', condoId).getString('name')
    } catch (_) {}

    const tracking = recebimento.getString('codigo_rastreio') || ''
    const code = recebimento.getString('codigo_retirada') || ''
    const message = template
      .replace(/{name}/g, moradorName)
      .replace(/{tracking}/g, tracking)
      .replace(/{code}/g, code)
      .replace(/{condoName}/g, condoName)

    if (!code) {
      return e.badRequestError(
        'Esta encomenda não possui código de retirada gerado; não é possível reenviar a mensagem.',
      )
    }

    // Instância WhatsApp do próprio condomínio
    const globalUrl = $secrets.get('EVOLUTION_API_URL') || ''
    const globalApiKey = $secrets.get('EVOLUTION_API_KEY') || ''
    if (!globalUrl || !globalApiKey) {
      return e.internalServerError(
        'Envio de WhatsApp não configurado no servidor. Contate o suporte.',
      )
    }

    let targetInstance = ''
    try {
      const condo = $app.findRecordById('condos', condoId)
      if (condo.getBool('whatsapp_connected')) {
        const inst = (condo.getString('whatsapp_instance_name') || '').trim()
        if (inst) targetInstance = inst
      }
    } catch (_) {}

    if (!targetInstance) {
      return e.json(503, {
        success: false,
        error: 'WHATSAPP_DESCONECTADO',
        message:
          'WhatsApp do condomínio desconectado. Reconecte em Configurações para reenviar a mensagem.',
      })
    }

    let url = globalUrl
    if (url.endsWith('/')) url = url.slice(0, -1)
    const endpoint = `${url}/message/sendText/${targetInstance}`

    let digits = String(phone).replace(/\D/g, '')
    digits = digits.replace(/^0+/, '')
    if (!digits.startsWith('55') && digits.length > 0) {
      digits = '55' + digits
    }
    const phoneNum = digits

    let success = false
    let logStatus = 'error'
    let parsedJson = null
    let responseStatus = 500

    try {
      const res = $http.send({
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: globalApiKey,
        },
        body: JSON.stringify({
          number: phoneNum,
          text: message,
        }),
        timeout: 15,
      })

      responseStatus = res.statusCode
      let rawText = ''
      try {
        if (res.body) rawText = new TextDecoder().decode(res.body)
      } catch (_) {
        rawText = String(res.body || '')
      }
      try {
        parsedJson = JSON.parse(rawText)
      } catch (_) {}

      if (res.statusCode >= 200 && res.statusCode < 300) {
        success = true
        logStatus = 'success'
      } else {
        logStatus = parsedJson && parsedJson.error ? String(parsedJson.error) : rawText || 'error'
      }
    } catch (err) {
      logStatus = err.message || 'error'
    }

    try {
      const waLogCol = $app.findCollectionByNameOrId('whatsapp_logs')
      const waLog = new Record(waLogCol)
      waLog.set('phone', phoneNum)
      waLog.set('message', message)
      waLog.set('status_code', responseStatus)
      waLog.set('success', success)
      waLog.set('condo_id', condoId)
      if (parsedJson) {
        waLog.set('response_body', parsedJson)
      } else {
        waLog.set('response_body', { error: logStatus })
      }
      $app.saveNoValidate(waLog)
    } catch (_) {}

    try {
      const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
      const log = new Record(logCol)
      log.set('morador', moradorName || 'Desconhecido')
      log.set('status', 'REENVIO_LIBERADO')
      log.set('mensagem', message)
      log.set('celular', phoneNum)
      log.set('sucesso', success)
      log.set('sender_match', true)
      log.set('condo_id', condoId)
      $app.saveNoValidate(log)
    } catch (_) {}

    if (success) {
      return e.json(200, { success: true, phone: phoneNum })
    }

    // Erro da Evolution (ex.: instância desconectada -> 400
    // "Cannot read properties of undefined (reading 'sendMessage')")
    const rawError = String(logStatus || '')
    const disconnected =
      rawError.indexOf('sendMessage') !== -1 ||
      rawError.toLowerCase().indexOf('not connected') !== -1 ||
      responseStatus === 404 ||
      responseStatus === 503
    return e.json(502, {
      success: false,
      error: disconnected ? 'WHATSAPP_DESCONECTADO' : 'WHATSAPP_ERRO_ENVIO',
      message: disconnected
        ? 'WhatsApp do condomínio desconectado. Reconecte em Configurações para reenviar a mensagem.'
        : 'Falha ao enviar a mensagem pelo WhatsApp do condomínio. Tente novamente em instantes.',
    })
  },
  $apis.requireAuth(),
)
