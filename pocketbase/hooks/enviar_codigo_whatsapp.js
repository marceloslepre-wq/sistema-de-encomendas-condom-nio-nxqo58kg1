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
    try {
      const body = e.requestInfo().body || {}
      const phone = body.phone

      if (typeof phone !== 'string' || !phone.trim()) {
        return e.json(200, { success: false, message: 'Phone is required' })
      }

      const apiUrl = $secrets.get('EVOLUTION_API_URL')
      const instance = $secrets.get('EVOLUTION_INSTANCE')
      const apikey = $secrets.get('EVOLUTION_API_KEY')

      if (!apiUrl || !instance || !apikey) {
        return e.json(200, {
          success: false,
          message: 'Serviço de WhatsApp não configurado corretamente.',
        })
      }

      let baseUrl = apiUrl
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
      const url = `${baseUrl}/message/sendText/${instance}`

      const headers = {
        'Content-Type': 'application/json',
        apikey: apikey,
      }

      // Limpar formatações e adicionar o prefixo 55 (Brasil) ao número de telefone
      const numericPhone = phone.replace(/\D/g, '')
      const exactPhone =
        numericPhone.startsWith('55') && numericPhone.length > 11
          ? numericPhone
          : `55${numericPhone}`

      // Gerar código de 6 dígitos de forma segura no backend
      const code = $security.randomStringWithAlphabet(6, '0123456789')
      const message = `Seu código de validação é: ${code}`

      // Persist verification code
      try {
        const verifCol = $app.findCollectionByNameOrId('whatsapp_verifications')
        const verifRecord = new Record(verifCol)
        verifRecord.set('phone', exactPhone)
        verifRecord.set('code', code)

        const expires = new Date()
        expires.setMinutes(expires.getMinutes() + 10)
        verifRecord.set('expires_at', expires.toISOString())
        verifRecord.set('used', false)
        verifRecord.set('attempts', 0)

        $app.save(verifRecord)
      } catch (err) {
        $app
          .logger()
          .error('Failed to save whatsapp_verifications', 'error', err.message || String(err))
        return e.json(200, {
          success: false,
          message: 'Falha ao gerar código de verificação internamente.',
        })
      }

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
        if (parsedJson) {
          if (parsedJson.messageId) messageId = parsedJson.messageId
          else if (parsedJson.id) messageId = parsedJson.id
          else if (parsedJson.key && parsedJson.key.id) messageId = parsedJson.key.id
        }

        return e.json(200, {
          success: true,
          messageId: messageId,
        })
      }

      logRecord.set('status', 'error')
      logRecord.set('response', parsedJson)
      $app.save(logRecord)

      const errorMsg =
        parsedJson?.message ||
        parsedJson?.error ||
        'Falha de comunicação com o WhatsApp. O serviço pode estar indisponível.'
      return e.json(200, { success: false, message: errorMsg })
    } catch (err) {
      $app
        .logger()
        .error('Unexpected error in enviar-codigo-whatsapp', 'error', err.message || String(err))
      return e.json(200, { success: false, message: 'Erro interno ao processar a solicitação.' })
    }
  },
  $apis.requireAuth(),
)
