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

    const apiUrl =
      'https://api.z-api.io/instances/3F3FE6AB8AF55107542D6627BE24201D/token/D41BBA7471F8F494D528DB60/send-text'

    const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const logRecord = new Record(logCol)
    logRecord.set('phone', phone)
    logRecord.set('message', message)

    try {
      const res = $http.send({
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, message }),
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
      } else {
        logRecord.set('status', 'error')
        logRecord.set('response', parsedJson)
        $app.save(logRecord)

        return e.json(res.statusCode, {
          success: false,
          error: parsedJson && parsedJson.error ? String(parsedJson.error) : 'API request failed',
        })
      }
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
