routerAdd(
  'POST',
  '/backend/v1/sms/send',
  (e) => {
    const body = e.requestInfo().body
    if (!body.phone) {
      return e.badRequestError('Phone is required')
    }

    const phoneNum = String(body.phone || '').replace(/\D/g, '')

    // Generate 6-digit code
    const code = $security.randomStringWithAlphabet(6, '0123456789')

    // Expiration 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString()

    const collection = $app.findCollectionByNameOrId('sms_verifications')
    const record = new Record(collection)
    record.set('phone', phoneNum)
    record.set('code', code)
    record.set('expires_at', expiresAt)
    record.set('used', false)

    $app.save(record)

    $app.logger().info('Sending SMS', 'phone', phoneNum, 'code', code)

    const accountSid = $secrets.get('TWILIO_ACCOUNT_SID')
    const authToken = $secrets.get('TWILIO_AUTH_TOKEN')
    const fromPhone = $secrets.get('TWILIO_PHONE_NUMBER')

    if (accountSid && authToken && fromPhone) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      const btoa = (input) => {
        let str = String(input)
        let output = ''
        for (
          let block = 0, charCode, i = 0, map = chars;
          str.charAt(i | 0) || ((map = '='), i % 1);
          output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
        ) {
          charCode = str.charCodeAt((i += 3 / 4))
          if (charCode > 0xff) throw new Error('invalid char')
          block = (block << 8) | charCode
        }
        return output
      }

      const toPhone = '+' + (phoneNum.startsWith('55') ? phoneNum : '55' + phoneNum)
      const payload = `To=${encodeURIComponent(toPhone)}&From=${encodeURIComponent(fromPhone)}&Body=${encodeURIComponent('Seu código de verificação é: ' + code)}`
      const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`)

      try {
        const res = $http.send({
          url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: authHeader,
          },
          body: payload,
          timeout: 10,
        })

        if (res.statusCode < 200 || res.statusCode >= 300) {
          $app.logger().error('Twilio Error', 'status', res.statusCode, 'body', res.json)
          return e.badRequestError('Erro ao enviar SMS pelo provedor.')
        }
      } catch (err) {
        $app.logger().error('Twilio Request Error', 'error', err)
        return e.badRequestError('Erro de conexão ao enviar SMS.')
      }
    } else {
      $app.logger().warn('Twilio secrets missing, SMS not physically sent')
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
