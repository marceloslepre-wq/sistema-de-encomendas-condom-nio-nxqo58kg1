routerAdd(
  'POST',
  '/backend/v1/whatsapp/send',
  (e) => {
    const body = e.requestInfo().body
    if (!body.phone) {
      return e.badRequestError('Phone is required')
    }

    const phoneNum = String(body.phone || '').replace(/\D/g, '')
    const tipo = body.tipo || 'codigo'

    let code = ''
    let message = body.message

    if (tipo === 'codigo') {
      code = $security.randomStringWithAlphabet(6, '0123456789')
      message = `Seu código de validação é: ${code}`
      // Expiration 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString()

      const verifCol = $app.findCollectionByNameOrId('whatsapp_verifications')
      const verif = new Record(verifCol)
      verif.set('phone', phoneNum)
      verif.set('code', code)
      verif.set('expires_at', expiresAt)
      verif.set('used', false)
      verif.set('attempts', 0)
      $app.save(verif)
    }

    let logStatus = 'error'
    let zApiResponse = null
    let zApiError = null

    try {
      // Hardcoded test payload per integration requirements
      const testPhone = '5527999740817'
      const testMessage = 'Teste de envio do sistema de encomendas CondoPack.'

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
        zApiResponse = res.json
      } else {
        $app.logger().error('Z-API Error', 'status', res.statusCode, 'body', res.json)
        logStatus =
          res.json && res.json.error
            ? String(res.json.error)
            : res.json && res.json.message
              ? String(res.json.message)
              : 'error'
        zApiError = res.json || { message: 'Unknown error from Z-API', status: res.statusCode }
      }
    } catch (err) {
      $app.logger().error('Z-API Request Error', 'error', err)
      logStatus = err.message ? String(err.message) : 'error'
      zApiError = { message: logStatus }
    }

    const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const log = new Record(logCol)
    // Log original intent for system auditing
    log.set('phone', phoneNum)
    log.set('message', message)
    log.set('tipo', tipo)
    log.set('status', logStatus)
    $app.save(log)

    if (logStatus !== 'success') {
      return e.json(500, {
        success: false,
        error: 'Erro ao enviar WhatsApp pelo provedor',
        details: zApiError,
      })
    }

    return e.json(200, zApiResponse || { success: true })
  },
  $apis.requireAuth(),
)
