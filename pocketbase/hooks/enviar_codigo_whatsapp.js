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

    // Adicionar o prefixo 55 (Brasil) ao número de telefone
    const exactPhone = phone.startsWith('55') && phone.length > 11 ? phone : `55${phone}`

    const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const logRecord = new Record(logCol)
    logRecord.set('phone', exactPhone)
    logRecord.set('message', message)

    let res = null
    let parsedJson = null
    let rawText = ''
    let isSuccess = false

    try {
      res = $http.send({
        url: url,
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ number: exactPhone, text: message }),
        timeout: 10,
      })

      isSuccess = res.statusCode >= 200 && res.statusCode < 300

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

      try {
        parsedJson = JSON.parse(rawText)
      } catch (err) {
        parsedJson = { raw: rawText }
      }

      if (!isSuccess) {
        $app
          .logger()
          .error('Evolution API Error', 'url', url, 'status', res.statusCode, 'response', rawText)
      }
    } catch (err) {
      $app
        .logger()
        .error('Evolution API Exception', 'url', url, 'error', err.message || String(err))
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
    logRecord.set('response', parsedJson || { error: rawText || 'API request failed' })
    $app.save(logRecord)

    return e.json(
      res ? res.statusCode : 400,
      parsedJson || { error: rawText || 'API request failed' },
    )
  },
  $apis.requireAuth(),
)
