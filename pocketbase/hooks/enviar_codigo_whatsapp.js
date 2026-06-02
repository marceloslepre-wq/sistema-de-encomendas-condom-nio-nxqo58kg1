/*
  ====================================================================================================
  INTEGRAÇÃO EVOLUTION API (SKIP CLOUD)
  ====================================================================================================
  Este hook lê as credenciais da Evolution API via secrets do Skip Cloud/PocketBase.

  Secrets obrigatórias no Skip Cloud:
  - EVOLUTION_API_URL (ex.: https://api.sholver.com.br)
  - EVOLUTION_API_KEY (apikey da Evolution)

  Endpoint final utilizado:
  - ${EVOLUTION_API_URL}/message/sendText/Encomenda

  IMPORTANTE:
  - Sem essas secrets configuradas, o envio falha com erro de configuração.
  - O número é normalizado para o formato 55 + DDD + número (somente dígitos).
  ====================================================================================================
*/

function normalizeBrazilianNumber(input) {
  let digits = String(input || '').replace(/\D/g, '')

  // Remove zeros iniciais comuns de discagem local.
  digits = digits.replace(/^0+/, '')

  // Garante DDI brasileiro.
  if (!digits.startsWith('55')) {
    digits = '55' + digits
  }

  return digits
}

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

    // Secrets configuradas no Skip Cloud (aba "Segredos")
    const apiUrl = $secrets.get('EVOLUTION_API_URL')
    const apiKey = $secrets.get('EVOLUTION_API_KEY')

    if (!apiUrl || !String(apiUrl).trim()) {
      return e.internalServerError('Missing Skip Cloud secret: EVOLUTION_API_URL')
    }

    if (!apiKey || !String(apiKey).trim()) {
      return e.internalServerError('Missing Skip Cloud secret: EVOLUTION_API_KEY')
    }

    const baseUrl = String(apiUrl).replace(/\/+$/, '')
    const url = `${baseUrl}/message/sendText/Encomenda`

    const normalizedNumber = normalizeBrazilianNumber(phone)

    // 55 + DDD + número local (10 ou 11 dígitos no Brasil => total 12 ou 13)
    if (normalizedNumber.length < 12 || normalizedNumber.length > 13) {
      return e.badRequestError('Phone must be in format 55 + DDD + number')
    }

    const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const logRecord = new Record(logCol)
    logRecord.set('phone', normalizedNumber)
    logRecord.set('message', message)

    try {
      const res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: normalizedNumber,
          text: message,
        }),
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

        return e.json(200, {
          success: true,
          data: parsedJson,
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
            : 'Evolution API request failed'

      return e.json(res.statusCode, {
        success: false,
        error: apiError,
        data: parsedJson,
      })
    } catch (err) {
      logRecord.set('status', 'error')
      logRecord.set('response', { error: err.message || String(err) })
      $app.save(logRecord)

      return e.json(500, {
        success: false,
        error: err.message || String(err),
      })
    }
  },
  $apis.requireAuth(),
)
