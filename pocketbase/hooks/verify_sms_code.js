routerAdd(
  'POST',
  '/backend/v1/sms/verify',
  (e) => {
    const body = e.requestInfo().body
    if (!body.phone || !body.code) {
      return e.badRequestError(
        'Phone and code are required. Se o morador não possui celular, utilize validação presencial (ID/Documento).',
      )
    }

    const phoneNum = String(body.phone || '').replace(/\D/g, '')

    const records = $app.findRecordsByFilter(
      'sms_verifications',
      'phone = {:phone} && code = {:code} && used = false',
      '-created',
      1,
      0,
      { phone: phoneNum, code: body.code },
    )

    if (records.length === 0) {
      return e.badRequestError('Invalid or expired code')
    }

    const record = records[0]

    // Check expiration manually to avoid date format discrepancies in SQLite
    const expiresAtStr = record.getString('expires_at')
    if (new Date(expiresAtStr).getTime() < Date.now()) {
      return e.badRequestError('Invalid or expired code')
    }
    record.set('used', true)
    $app.save(record)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
