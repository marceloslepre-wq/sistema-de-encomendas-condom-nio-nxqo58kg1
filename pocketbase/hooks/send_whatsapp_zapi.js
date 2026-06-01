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

    const instanceId = $os.getenv('ZAPI_INSTANCE_ID') || $secrets.get('ZAPI_INSTANCE_ID')
    const token = $os.getenv('ZAPI_TOKEN') || $secrets.get('ZAPI_TOKEN')

    let logStatus = 'error'

    if (!instanceId || !token) {
      $app.logger().warn('Z-API secrets missing, WhatsApp not physically sent')
      logStatus = 'Credenciais ZAPI ausentes'

      const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
      const log = new Record(logCol)
      log.set('phone', phoneNum)
      log.set('message', message)
      log.set('tipo', tipo)
      log.set('status', logStatus)
      $app.save(log)

      return e.json(200, {
        success: false,
        error: 'Erro de configuração: Credenciais do WhatsApp (Z-API) não encontradas no sistema.',
      })
    }

    try {
      const toPhone = phoneNum.startsWith('55') ? phoneNum : '55' + phoneNum
      const res = $http.send({
        url: `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: toPhone, message: message }),
        timeout: 10,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        logStatus = 'success'
      } else {
        $app.logger().error('Z-API Error', 'status', res.statusCode, 'body', res.json)
        logStatus =
          res.json && res.json.error
            ? String(res.json.error)
            : res.json && res.json.message
              ? String(res.json.message)
              : 'error'
      }
    } catch (err) {
      $app.logger().error('Z-API Request Error', 'error', err)
      logStatus = err.message ? String(err.message) : 'error'
    }

    const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const log = new Record(logCol)
    log.set('phone', phoneNum)
    log.set('message', message)
    log.set('tipo', tipo)
    log.set('status', logStatus)
    $app.save(log)

    if (logStatus !== 'success') {
      // Handle gracefully without crashing the frontend execution stack
      return e.json(200, {
        success: false,
        error: 'Erro ao enviar WhatsApp pelo provedor. Detalhes: ' + logStatus,
      })
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
