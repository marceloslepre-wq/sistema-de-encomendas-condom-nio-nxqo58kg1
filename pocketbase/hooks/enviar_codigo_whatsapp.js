/*
  ====================================================================================================
  INTEGRAÇÃO EVOLUTION API
  ====================================================================================================
  Hook de envio de código WhatsApp.
  Rota registrada:
  - /backend/v1/enviar-codigo-whatsapp
  ====================================================================================================
*/

routerAdd(
  'POST',
  '/backend/v1/enviar-codigo-whatsapp',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const { phone } = body
      let message = body.message
      let codigo = body.codigo

      console.log(`Hook recebido: ${JSON.stringify({ phone, message })}`)

      if (!phone) {
        return e.json(200, {
          success: false,
          message: 'O parâmetro phone é obrigatório.',
        })
      }

      if (!codigo) {
        codigo = Math.floor(100000 + Math.random() * 900000).toString()
      }

      if (!message) {
        message = `Seu código de validação: ${codigo}`
      }

      const apiUrl = $secrets.get('EVOLUTION_API_URL')
      const instance = $secrets.get('EVOLUTION_INSTANCE')
      const apikey = $secrets.get('EVOLUTION_API_KEY')

      if (!apiUrl || !instance || !apikey) {
        $app.logger().error('Missing WhatsApp secrets')
        return e.json(200, {
          success: false,
          message: 'Serviço de WhatsApp não configurado corretamente.',
        })
      }

      let baseUrl = apiUrl
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
      const url = `${baseUrl}/message/sendText/${instance}`

      console.log(`URL: ${url}`)

      const headers = {
        'Content-Type': 'application/json',
        apikey: apikey,
      }

      // Limpar formatações e adicionar o prefixo 55 (Brasil) ao número de telefone
      const numericPhone = String(phone).replace(/\D/g, '')
      const exactPhone =
        numericPhone.startsWith('55') && numericPhone.length > 11
          ? numericPhone
          : `55${numericPhone}`

      // Persist verification code
      try {
        const verifCol = $app.findCollectionByNameOrId('whatsapp_verifications')
        const verifRecord = new Record(verifCol)
        verifRecord.set('phone', exactPhone)
        verifRecord.set('code', codigo)

        const expires = new Date()
        expires.setMinutes(expires.getMinutes() + 15)
        verifRecord.set('expires', expires.toISOString())
        verifRecord.set('verified', false)
        verifRecord.set('attempts', 0)

        $app.save(verifRecord)
      } catch (err) {
        $app
          .logger()
          .error('Failed to save whatsapp_verifications', 'error', err.message || String(err))
        return e.json(200, {
          success: false,
          message: 'Falha ao salvar código de verificação internamente.',
        })
      }

      const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
      const logRecord = new Record(logCol)
      logRecord.set('phone', exactPhone)
      logRecord.set('message', message)

      let isSuccess = false
      let parsedJson = null
      let statusCode = 400

      console.log('Enviando para Evolution...')

      try {
        const payloadStr = JSON.stringify({
          number: exactPhone,
          text: message,
        })

        const res = $http.send({
          url: url,
          method: 'POST',
          headers: headers,
          body: payloadStr,
          timeout: 10,
        })

        statusCode = res.statusCode
        isSuccess = statusCode >= 200 && statusCode < 300
        parsedJson = res.json || {}

        console.log(`Resposta Evolution: ${JSON.stringify(parsedJson)}`)

        if (!isSuccess) {
          console.log(
            `ERRO Evolution: ${JSON.stringify({ status: statusCode, error: parsedJson })}`,
          )
        }
      } catch (err) {
        console.log(`ERRO Evolution: ${err.message || String(err)}`)
        parsedJson = { error: err.message || String(err) }
        statusCode = 500
      }

      logRecord.set('status_code', statusCode)
      logRecord.set('success', isSuccess)
      logRecord.set('response_body', isSuccess ? { ...parsedJson, successUrl: url } : parsedJson)
      try {
        $app.save(logRecord)
      } catch (err) {
        $app.logger().error('Failed to save whatsapp_logs', 'error', err.message || String(err))
      }

      try {
        const notifCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
        const notif = new Record(notifCol)
        notif.set('morador', 'Portaria/Entregador')
        notif.set('status', isSuccess ? 'enviado' : 'falha')
        notif.set('mensagem', message)
        notif.set('celular', exactPhone)
        notif.set('sucesso', isSuccess)
        notif.set('sender_match', true)
        notif.set('sender_number', '')
        $app.save(notif)
      } catch (err) {
        $app
          .logger()
          .error('Failed to save notificacoes_enviadas', 'error', err.message || String(err))
      }

      if (isSuccess) {
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

      let errorMsg = 'Falha de comunicação com o WhatsApp. O serviço pode estar indisponível.'

      if (parsedJson) {
        if (typeof parsedJson === 'string') {
          errorMsg = parsedJson
        } else if (parsedJson.message && typeof parsedJson.message === 'string') {
          errorMsg = parsedJson.message
        } else if (parsedJson.error && typeof parsedJson.error === 'string') {
          errorMsg = parsedJson.error
        } else if (Array.isArray(parsedJson.message)) {
          errorMsg = parsedJson.message.join(', ')
        } else if (parsedJson.response && typeof parsedJson.response === 'string') {
          errorMsg = parsedJson.response
        } else if (parsedJson.response && parsedJson.response.message) {
          errorMsg = parsedJson.response.message
        } else if (Object.keys(parsedJson).length > 0) {
          errorMsg = JSON.stringify(parsedJson)
        }
      }

      return e.json(200, { success: false, message: errorMsg, status: statusCode })
    } catch (err) {
      $app
        .logger()
        .error('Unexpected error in enviar-codigo-whatsapp', 'error', err.message || String(err))
      return e.json(200, { success: false, message: 'Erro interno ao processar a solicitação.' })
    }
  },
  $apis.requireAuth(),
)
