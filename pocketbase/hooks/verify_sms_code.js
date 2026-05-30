routerAdd(
  'POST',
  '/backend/v1/sms/verify',
  (e) => {
    const body = e.requestInfo().body
    if (!body.phone || !body.code) {
      return e.badRequestError('Phone and code are required')
    }

    const now = new Date().toISOString()

    const phoneNum = String(body.phone || '').replace(/\D/g, '')

    const records = $app.findRecordsByFilter(
      'sms_verifications',
      'phone = {:phone} && code = {:code} && used = false && expires_at > {:now}',
      '-created',
      1,
      0,
      { phone: phoneNum, code: body.code, now: now },
    )

    if (records.length === 0) {
      return e.badRequestError('Invalid or expired code')
    }

    const record = records[0]
    record.set('used', true)
    $app.save(record)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
