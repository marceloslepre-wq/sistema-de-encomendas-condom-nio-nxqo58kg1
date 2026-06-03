/*
  ====================================================================================================
  INTEGRAÇÃO EVOLUTION API
  ====================================================================================================
  Hook de envio de código WhatsApp.
  Rota registrada:
  - /backend/v1/enviar-codigo-whatsapp
  ====================================================================================================
*/

// Rota principal usada pelo frontend
routerAdd(
  'POST',
  '/backend/v1/enviar-codigo-whatsapp',
  (e) => {
    const body = e.requestInfo().body || {}
    const phone = body.phone
    const message = body.message

    const url = 'https://api.sholver.com.br/message/sendText/Encomenda'
    const headers = {
      'Content-Type': 'application/json',
      apikey: 'E470E6186A4B-428C-A4EC-E48533ACED91',
    }

    if (typeof phone !== 'string' || !phone.trim()) {
      return e.badRequestError('Phone is required')
    }

    if (typeof message !== 'string' || !message.trim()) {
      return e.badRequestError('Message is required')
    }

    // Limpar formatações e adicionar o prefixo 55 (Brasil) ao número de telefone
    const numericPhone = phone.replace(/\D/g, '')
    const exactPhone =
      numericPhone.startsWith('55') && numericPhone.length > 11 ? numericPhone : `55${numericPhone}`

    const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const logRecord = new Record(logCol)
    logRecord.set('phone', exactPhone)
    logRecord.set('message', message)

    let isSuccess = false
    let parsedJson = null
    let statusCode = 400

    try {
      const res = $http.send({
        url: url,
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          number: exactPhone,
          options: {
            delay: 0,
            presence: 'composing',
            linkPreview: false,
          },
          text: message,
        }),
        timeout: 10,
      })

      statusCode = res.statusCode
      isSuccess = statusCode >= 200 && statusCode < 300
      parsedJson = res.json || {}

      if (!isSuccess) {
        $app
          .logger()
          .error(
            'Evolution API Error',
            'url',
            url,
            'status',
            statusCode,
            'response',
            JSON.stringify(parsedJson),
          )
      }
    } catch (err) {
      $app
        .logger()
        .error('Evolution API Exception', 'url', url, 'error', err.message || String(err))
      parsedJson = { error: err.message || String(err) }
      statusCode = 500
    }

    if (isSuccess) {
      logRecord.set('status', 'success')
      logRecord.set('response', { ...parsedJson, successUrl: url })
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
        url: url,
      })
    }

    logRecord.set('status', 'error')
    logRecord.set('response', parsedJson)
    $app.save(logRecord)

    return e.json(statusCode, parsedJson)
  },
  $apis.requireAuth(),
)
