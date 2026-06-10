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

    let url = $secrets.get('EVOLUTION_API_URL')
    const instance = $secrets.get('EVOLUTION_INSTANCE')
    const apikey = $secrets.get('EVOLUTION_API_KEY')
    const senderNumber = $secrets.get('EVOLUTION_NUMERO_SENDER') || ''

    if (!url || !instance || !apikey) {
      return e.internalServerError('Evolution API not configured')
    }

    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    const endpoint = `${url}/message/sendText/${instance}`

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
          apikey: apikey,
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
      waLog.set('tipo', 'notificacao_manual')
      waLog.set('status', logStatus)
      waLog.set('success', success)
      if (parsedJson) waLog.set('response_body', parsedJson)
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
