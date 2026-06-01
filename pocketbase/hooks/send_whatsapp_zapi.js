routerAdd(
  'POST',
  '/backend/v1/whatsapp/send',
  (e) => {
    if (e.request.method !== 'POST') {
      return e.json(405, { error: 'Method Not Allowed' })
    }

    const body = e.requestInfo().body || {}
    if (!body.phone) {
      return e.badRequestError('Phone is required')
    }

    const phoneNum = String(body.phone || '').replace(/\D/g, '')
    const tipo = body.tipo || 'codigo'

    let code = ''
    let originalMessage = body.message || 'Mensagem padrão'

    if (tipo === 'codigo') {
      code = $security.randomStringWithAlphabet(6, '0123456789')
      originalMessage = `Seu código de validação é: ${code}`
      // Expiration 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString()

      try {
        const verifCol = $app.findCollectionByNameOrId('whatsapp_verifications')
        const verif = new Record(verifCol)
        verif.set('phone', phoneNum)
        verif.set('code', code)
        verif.set('expires_at', expiresAt)
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
      // Hardcoded test payload per integration requirements
      const testPhone = '5527999740817'
      const testMessage = 'Teste de comunicação do sistema CondoPack.'

      let logStatus = 'error'

      const res = $http.send({
        url: 'https://api.z-api.io/instances/3F3FE6AB8AF55107542D6627BE24201D/token/D41BBA7471F8F494D528DB60/send-text',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-token': 'D41BBA7471F8F494D528DB60',
        },
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
        timeout: 10,
      })

      let rawText = ''
      try {
        if (res.body) {
          rawText = new TextDecoder().decode(res.body)
        }
      } catch (decodeErr) {
        rawText = String(res.body)
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
        $app.logger().error('Z-API Error', 'status', res.statusCode, 'body', rawText)
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
      $app.logger().error('Z-API Request Global Error', 'error', err.message || String(err))
      return e.json(500, {
        success: false,
        catch_error: err.message || String(err),
      })
    }
  },
  $apis.requireAuth(),
)
