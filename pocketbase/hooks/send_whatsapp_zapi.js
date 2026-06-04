/*
  ====================================================================================================
  LEGACY ROUTE COMPATÍVEL COM EVOLUTION API (SKIP CLOUD)
  ====================================================================================================
  Esta rota é mantida por compatibilidade para clientes que ainda chamam:
  POST /backend/v1/whatsapp/send

  Secrets obrigatórias no Skip Cloud:
  - EVOLUTION_API_URL (ex.: https://api.sholver.com.br)
  - EVOLUTION_API_KEY (apikey da Evolution)

  Endpoint final utilizado:
  - ${EVOLUTION_API_URL}/message/sendText/Encomenda
  ====================================================================================================
*/

routerAdd(
  'POST',
  '/backend/v1/whatsapp/send',
  (e) => {
    function normalizeBrazilianNumber(input) {
      let digits = String(input || '').replace(/\D/g, '')
      digits = digits.replace(/^0+/, '')

      if (!digits.startsWith('55')) {
        digits = '55' + digits
      }

      return digits
    }

    if (e.request.method !== 'POST') {
      return e.json(405, { error: 'Method Not Allowed' })
    }

    const body = e.requestInfo().body || {}
    if (!body.phone) {
      return e.badRequestError('Phone is required')
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

    const phoneNum = normalizeBrazilianNumber(body.phone)
    if (phoneNum.length < 12 || phoneNum.length > 13) {
      return e.badRequestError('Phone must be in format 55 + DDD + number')
    }

    const tipo = body.tipo || 'codigo'

    let code = ''
    let originalMessage = body.message || 'Mensagem padrão'

    if (tipo === 'codigo') {
      code = $security.randomStringWithAlphabet(6, '0123456789')
      originalMessage = `Seu código de validação é: ${code}`
      // Changed to 15 minutes to match the system update and ensure consistency
      const expires = new Date()
      expires.setMinutes(expires.getMinutes() + 15)

      try {
        const verifCol = $app.findCollectionByNameOrId('whatsapp_verifications')
        const verif = new Record(verifCol)
        verif.set('phone', phoneNum)
        verif.set('code', code)
        verif.set('expires_at', expires.toISOString().replace('T', ' '))
        verif.set('used', false)
        verif.set('attempts', 0)
        $app.save(verif)
      } catch (err) {
        $app
          .logger()
          .error('Failed to save whatsapp verification', 'error', err.message || String(err))
      }
    }

    try {
      let logStatus = 'error'

      const res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: phoneNum, text: originalMessage }),
        timeout: 10,
      })

      let rawText = ''
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

      let parsedJson = null
      let parseFailed = false

      try {
        parsedJson = JSON.parse(rawText)
      } catch (parseErr) {
        parseFailed = true
      }

      const isSuccess = res.statusCode >= 200 && res.statusCode < 300

      if (isSuccess) {
        logStatus = 'success'
      } else {
        logStatus = parsedJson && parsedJson.error ? String(parsedJson.error) : rawText || 'error'
        $app.logger().error('Evolution API Error', 'status', res.statusCode, 'body', rawText)
      }

      try {
        const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
        const log = new Record(logCol)
        log.set('phone', phoneNum)
        log.set('message', originalMessage)
        log.set('tipo', tipo)
        log.set('status', logStatus)
        $app.save(log)
      } catch (logErr) {
        $app
          .logger()
          .error('Failed to save whatsapp log', 'error', logErr.message || String(logErr))
      }

      if (parseFailed) {
        const statusCode = isSuccess ? 400 : res.statusCode
        return e.json(statusCode, {
          success: false,
          message: rawText || 'Failed to parse API response',
          raw_error: rawText,
        })
      }

      if (!isSuccess) {
        return e.json(res.statusCode, {
          success: false,
          message: logStatus,
          error: logStatus,
          data: parsedJson,
        })
      }

      return e.json(200, {
        success: true,
        data: parsedJson,
      })
    } catch (err) {
      $app.logger().error('Evolution API Request Global Error', 'error', err.message || String(err))
      return e.json(500, {
        success: false,
        catch_error: err.message || String(err),
      })
    }
  },
  $apis.requireAuth(),
)
