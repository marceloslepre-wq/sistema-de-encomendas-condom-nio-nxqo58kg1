routerAdd(
  'POST',
  '/backend/v1/verify-whatsapp-code',
  (e) => {
    const body = e.requestInfo().body || {}
    const phone = body.phone
    const code = body.code

    if (typeof phone !== 'string' || !phone.trim() || typeof code !== 'string' || !code.trim()) {
      return e.badRequestError('Phone and code are required')
    }

    const numericPhone = phone.replace(/\D/g, '')
    const exactPhone =
      numericPhone.startsWith('55') && numericPhone.length > 11 ? numericPhone : `55${numericPhone}`

    try {
      const verifRecord = $app.findFirstRecordByFilter(
        'whatsapp_verifications',
        'phone = {:phone} && code = {:code} && used = false && expires_at > {:now}',
        { phone: exactPhone, code: code, now: new Date().toISOString() },
      )

      verifRecord.set('used', true)
      $app.save(verifRecord)

      return e.json(200, { success: true })
    } catch (err) {
      return e.badRequestError('Código inválido ou expirado.')
    }
  },
  $apis.requireAuth(),
)
