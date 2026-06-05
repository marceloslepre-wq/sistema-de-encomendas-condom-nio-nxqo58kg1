routerAdd(
  'POST',
  '/backend/v1/enviar-notificacao-morador',
  (e) => {
    const body = e.requestInfo().body || {}
    const { phone, message } = body

    if (!phone || !message) {
      return e.badRequestError('Phone and message are required')
    }

    let url = $secrets.get('EVOLUTION_API_URL')
    const instance = $secrets.get('EVOLUTION_INSTANCE')
    const apikey = $secrets.get('EVOLUTION_API_KEY')

    if (!url || !instance || !apikey) {
      return e.internalServerError('Evolution API not configured')
    }

    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    const endpoint = `${url}/message/sendText/${instance}`

    try {
      const res = $http.send({
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apikey,
        },
        body: JSON.stringify({
          number: phone,
          text: message,
        }),
        timeout: 15,
      })

      return e.json(200, { success: true, response: res.json })
    } catch (err) {
      return e.internalServerError(err.message)
    }
  },
  $apis.requireAuth(),
)
