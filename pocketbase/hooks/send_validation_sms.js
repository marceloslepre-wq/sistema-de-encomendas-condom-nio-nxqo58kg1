routerAdd(
  'POST',
  '/backend/v1/sms/send',
  (e) => {
    const body = e.requestInfo().body
    if (!body.phone) {
      return e.badRequestError('Phone is required')
    }

    // Generate 6-digit code
    const code = $security.randomStringWithAlphabet(6, '0123456789')

    // Expiration 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString()

    const collection = $app.findCollectionByNameOrId('sms_verifications')
    const record = new Record(collection)
    record.set('phone', body.phone)
    record.set('code', code)
    record.set('expires_at', expiresAt)
    record.set('used', false)

    $app.save(record)

    $app.logger().info('Sending SMS', 'phone', body.phone, 'code', code)

    // Return code in response to ease testing without real Twilio
    return e.json(200, { success: true, mockCode: code })
  },
  $apis.requireAuth(),
)
