routerAdd(
  'POST',
  '/backend/v1/enviar-notificacao-morador',
  (e) => {
    const body = e.requestInfo().body || {}
    const { phone, message, morador } = body

    if (!phone || !message) {
      $app.logger().info('Notification skipped: missing phone or message')
      return e.badRequestError('Phone and message are required. Unable to send notification.')
    }

    const globalUrl = $secrets.get('EVOLUTION_API_URL') || ''
    const globalInstance = $secrets.get('EVOLUTION_INSTANCE') || 'Encomenda'
    const globalApiKey = $secrets.get('EVOLUTION_API_KEY') || ''
    const globalSender = $secrets.get('EVOLUTION_NUMBER_SEND') || ''

    if (!globalUrl || !globalApiKey) {
      const errorMsg = 'Evolution API not fully configured, missing EVOLUTION_API_KEY or URL'
      $app.logger().error(errorMsg)
      try {
        const waLogCol = $app.findCollectionByNameOrId('whatsapp_logs')
        const waLog = new Record(waLogCol)
        waLog.set('phone', phone || '')
        waLog.set('message', message || '')
        waLog.set('status_code', 500)
        waLog.set('response_body', { error: errorMsg })
        waLog.set('success', false)
        $app.saveNoValidate(waLog)
      } catch (_) {}
      return e.internalServerError(errorMsg)
    }

    let condoId = body.condo_id || ''
    const auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!condoId && auth) {
      condoId = auth.getString('condo_id') || ''
    }

    // Resolução dinâmica da instância:
    // - Própria conectada -> usa ela
    // - Desconectado -> fallback "Encomendas" APENAS se for o cliente de demonstração "Condomínio Residencial Parque"
    // - Qualquer outro condomínio desconectado -> pula silenciosamente
    let targetInstance = ''
    let senderNumber = globalSender
    let shouldSend = false

    if (condoId) {
      try {
        const condo = $app.findRecordById('condos', condoId)
        if (condo && condo.getBool('whatsapp_connected')) {
          const inst = (condo.getString('whatsapp_instance_name') || '').trim()
          const cPhone = (condo.getString('whatsapp_phone') || '').trim()
          if (inst) {
            targetInstance = inst
            if (cPhone) senderNumber = cPhone
            shouldSend = true
          }
        } else if (condo) {
          const cId = condo.id || ''
          const cName = (condo.getString('name') || '').trim().toLowerCase()
          const isDemo = cId === 'cjvbjhk0senz1yt' || cName.indexOf('residencial parque') !== -1
          if (isDemo) {
            targetInstance = globalInstance
            shouldSend = true
          }
        }
      } catch (_) {}
    }

    if (!shouldSend || !targetInstance) {
      $app.logger().info('WhatsApp envio pulado: condomínio desconectado e não é demo')
      return e.json(200, {
        success: true,
        skipped: true,
        message: 'Condomínio desconectado. Envio WhatsApp ignorado.',
      })
    }

    let url = globalUrl
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    const endpoint = `${url}/message/sendText/${targetInstance}`

    let digits = String(phone || '').replace(/\D/g, '')
    digits = digits.replace(/^0+/, '')
    if (!digits.startsWith('55') && digits.length > 0) {
      digits = '55' + digits
    }
    const phoneNum = digits || phone

    let success = false
    let logStatus = 'error'
    let rawText = ''
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

      try {
        if (res.body) {
          rawText = new TextDecoder().decode(res.body)
        }
      } catch (decodeErr) {
        if (Array.isArray(res.body)) {
          rawText = String.fromCharCode.apply(null, res.body)
        } else {
          rawText = String(res.body)
        }
      }

      try {
        parsedJson = JSON.parse(rawText)
      } catch (parseErr) {}

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
      if (condoId) waLog.set('condo_id', condoId)
      if (parsedJson) {
        waLog.set('response_body', parsedJson)
      } else {
        waLog.set('response_body', { error: logStatus })
      }
      $app.saveNoValidate(waLog)
    } catch (err) {}

    try {
      const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
      const log = new Record(logCol)
      log.set('morador', morador || 'Desconhecido')
      log.set('status', 'MANUAL')
      log.set('mensagem', message)
      log.set('celular', phoneNum)
      log.set('sucesso', success)
      log.set('sender_match', true)
      log.set('sender_number', senderNumber)
      if (condoId) log.set('condo_id', condoId)
      $app.saveNoValidate(log)
    } catch (err) {}

    if (success) {
      return e.json(200, { success: true, response: parsedJson || rawText })
    } else {
      return e.json(responseStatus === 200 ? 500 : responseStatus, {
        success: false,
        error: logStatus,
        details: parsedJson,
      })
    }
  },
  $apis.requireAuth(),
)
