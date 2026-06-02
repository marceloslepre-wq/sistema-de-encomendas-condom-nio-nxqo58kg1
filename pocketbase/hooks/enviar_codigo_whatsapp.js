/*
  ====================================================================================================
  ATENÇÃO CRÍTICA - INTEGRAÇÃO Z-API
  ====================================================================================================
  NÃO MUDAR PARA VARIÁVEIS DE AMBIENTE!
  NÃO USAR secrets, process.env, import.meta.env ou qualquer configuração dinâmica para credenciais.

  A Z-API DESTE PROJETO EXIGE que INSTÂNCIA e TOKEN estejam DIRETAMENTE na URL do endpoint.
  Tentar enviar por headers de autenticação (ex: Client-Token) ou por secrets quebra o fluxo no Skip.

  REGRA OBRIGATÓRIA:
  - URL hardcoded com instância + token
  - Método POST
  - Body JSON com: { phone, message }
  - Sem headers de autenticação
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
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone
    }

    /*
      ATENÇÃO: NÃO MUDAR PARA VARIÁVEIS DE AMBIENTE!
      A Z-API EXIGE que instância e token estejam DIRETAMENTE na URL.
      NÃO funciona com headers de autenticação ou secrets neste projeto.
    */
    const apiUrl =
      'https://api.z-api.io/instances/3F3FE6AB8AF55107542D6627BE24201D/token/D41BBA7471F8F494D528DB60/send-text'

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
        },
        body: JSON.stringify({ phone: cleanPhone, message }),
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
      return e.badRequestError(`Erro Z-API: ${apiError}`)
    } catch (err) {
      logRecord.set('status', 'error')
      logRecord.set('response', { error: err.message || String(err) })
      $app.save(logRecord)

      return e.internalServerError(`Erro interno: ${err.message || String(err)}`)
    }
  },
  $apis.requireAuth(),
)
