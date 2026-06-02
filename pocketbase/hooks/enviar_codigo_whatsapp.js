/*
  ====================================================================================================
  INTEGRAÇÃO EVOLUTION API (OFICIAL)
  ====================================================================================================
  Configuração fixa solicitada:
  - Server URL: https://api.sholver.com.br
  - Endpoint: POST /message/sendText/Encomenda
  - Header obrigatório: apikey

  IMPORTANTE:
  - Este hook substitui totalmente a integração anterior de mensageria.
  - Este hook NÃO usa secrets/env para URL/chave da Evolution.
  - O número deve ser enviado no formato 55 + DDD + número (somente dígitos).
  ====================================================================================================
*/

const EVOLUTION_API_URL = 'https://api.sholver.com.br/message/sendText/Encomenda'
const EVOLUTION_API_KEY = '3Sqdj8r8CbQRbzon7vcIKSPWCP8gus6c'

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
        url: EVOLUTION_API_URL,
        method: 'POST',
        headers: {
          apikey: EVOLUTION_API_KEY,
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
