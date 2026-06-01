routerAdd(
  'POST',
  '/backend/v1/whatsapp/send',
  (e) => {
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

    // Hardcoded test payload per integration requirements
    const testPhone = '5527999740817'
    const testMessage = 'Teste de envio do sistema de encomendas CondoPack.'

    let logStatus = 'error'
    let zApiResponse = null
    let zApiError = null

    try {
      const res = $http.send({
        url: 'https://api.z-api.io/instances/3F3FE6AB8AF55107542D6627BE24201D/token/D41BBA7471F8F494D528DB60/send-text',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
        timeout: 10,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        logStatus = 'success'
        zApiResponse = res.json || {}
      } else {
        $app.logger().error('Z-API Error', 'status', res.statusCode, 'body', res.json)
        logStatus = res.json && res.json.error ? String(res.json.error) : 'error'
        zApiError = res.json || { statusCode: res.statusCode }
      }
    } catch (err) {
      $app.logger().error('Z-API Request Error', 'error', err.message || String(err))
      logStatus = err.message ? String(err.message) : 'error'
      zApiError = { error: logStatus }
    }

    try {
      const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
      const log = new Record(logCol)
      // Log original intent for system auditing
      log.set('phone', phoneNum)
      log.set('message', originalMessage)
      log.set('tipo', tipo)
      log.set('status', logStatus)
      $app.save(log)
    } catch (err) {
      $app.logger().error('Failed to save whatsapp log', 'error', err.message || String(err))
    }

    // Always return 200 with JSON to prevent 500 unhandled errors in frontend
    return e.json(200, {
      success: logStatus === 'success',
      data: zApiResponse || zApiError || {},
      error: logStatus !== 'success' ? logStatus : null,
    })
  },
  $apis.requireAuth(),
)
