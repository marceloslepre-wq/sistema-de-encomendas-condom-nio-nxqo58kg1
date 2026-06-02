/*
  ====================================================================================================
  INTEGRAÇÃO EVOLUTION API
  ====================================================================================================
  Conforme especificado, a URL e a apikey devem ser configuradas de forma explícita neste hook.
  ====================================================================================================
*/

routerAdd(
  'POST',
  '/backend/v1/enviar-codigo-whatsapp',
  (e) => {
    const body = e.requestInfo().body || {}
    const phone = body.phone
    const message = body.message

    if (typeof phone !== 'string' || !phone.trim()) {
      return e.badRequestError('Phone is required')
    }

    if (typeof message !== 'string' || !message.trim()) {
      return e.badRequestError('Message is required')
    }

    let cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }

    const apiUrl =
      'https://api.sholver.com.br/message/sendText/sistema-de-encomendas-condominio-03d6a'

    const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const logRecord = new Record(logCol)
    logRecord.set('phone', cleanPhone)
    logRecord.set('message', message)

    try {
      const res = $http.send({
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: '3Sqdj8r8CbQRbzon7vcIKSPWCP8gus6c',
        },
        body: JSON.stringify({ number: cleanPhone, text: message }),
        timeout: 10,
      })

      const isSuccess = res.statusCode >= 200 && res.statusCode < 300

      let rawText = ''
      try {
        if (res.body) {
          rawText = new TextDecoder().decode(res.body)
        }
      } catch (err) {
        if (Array.isArray(res.body)) {
          rawText = String.fromCharCode.apply(null, res.body)
        } else {
          rawText = String(res.body)
        }
      }

      let parsedJson = null
      try {
        parsedJson = JSON.parse(rawText)
      } catch (err) {
        parsedJson = { raw: rawText }
      }

      if (isSuccess) {
        logRecord.set('status', 'success')
        logRecord.set('response', parsedJson)
        $app.save(logRecord)

        let messageId = 'unknown'
        if (parsedJson && parsedJson.messageId) {
          messageId = parsedJson.messageId
        } else if (parsedJson && parsedJson.id) {
          messageId = parsedJson.id
        } else if (parsedJson && parsedJson.key && parsedJson.key.id) {
          messageId = parsedJson.key.id
        }

        return e.json(200, {
          success: true,
          messageId: messageId,
        })
      }

      logRecord.set('status', 'error')
      logRecord.set('response', parsedJson)
      $app.save(logRecord)

      const apiError =
        parsedJson && parsedJson.error
          ? String(parsedJson.error)
          : parsedJson && parsedJson.message
            ? String(parsedJson.message)
            : 'API request failed'
      return e.badRequestError(`Erro Evolution API: ${apiError}`)
    } catch (err) {
      logRecord.set('status', 'error')
      logRecord.set('response', { error: err.message || String(err) })
      $app.save(logRecord)

      return e.internalServerError(`Erro interno: ${err.message || String(err)}`)
    }
  },
  $apis.requireAuth(),
)
