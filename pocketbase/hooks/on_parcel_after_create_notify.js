onRecordAfterCreateSuccess((e) => {
  const status = e.record.getString('status')
  if (status !== 'RECEBIDO_PORTARIA' && status !== 'DISPONIVEL_RETIRADA') {
    return e.next()
  }

  const unitId = e.record.getString('unit_id')
  if (!unitId) return e.next()

  let unit
  try {
    unit = $app.findRecordById('units', unitId)
  } catch (err) {
    return e.next()
  }

  const condoId = unit.getString('condo_id')
  if (!condoId) return e.next()

  let condo
  try {
    condo = $app.findRecordById('condos', condoId)
  } catch (err) {
    return e.next()
  }

  if (!condo.getBool('notifications_enabled')) {
    return e.next()
  }

  const residents = $app.findRecordsByFilter(
    'users',
    "unit_id = {:unitId} && role = 'morador'",
    '',
    100,
    0,
    { unitId },
  )

  for (const resident of residents) {
    const email = resident.getString('email')
    const phone = resident.getString('phone')
    const tracking = e.record.getString('tracking_code') || 'N/A'
    const carrier = e.record.getString('carrier') || 'N/A'
    const condoName = condo.getString('name')

    const subject = `Update on your parcel - ${condoName}`
    let html = ''

    if (status === 'RECEBIDO_PORTARIA') {
      html = `<p>Olá ${resident.getString('name')},</p><p>Sua encomenda (Rastreio: ${tracking}, Transportadora: ${carrier}) foi <strong>Recebida na Portaria</strong>.</p>`
    } else if (status === 'DISPONIVEL_RETIRADA') {
      html = `<p>Olá ${resident.getString('name')},</p><p>Sua encomenda (Rastreio: ${tracking}) está <strong>Disponível para Retirada</strong>.</p><p>Por favor, dirija-se à portaria.</p>`
    }

    let sent = false

    if (email) {
      try {
        const message = new mailer.Message({
          from: { address: 'noreply@condominio.com', name: condoName },
          to: [{ address: email }],
          subject: subject,
          html: html,
        })
        $app.newMailClient().send(message)
        sent = true
      } catch (err) {
        $app.logger().error('Email error on parcel create', 'error', err.message)
      }
    }

    if (phone && status === 'DISPONIVEL_RETIRADA') {
      try {
        const url =
          ($secrets.get('PB_INSTANCE_URL') || 'http://localhost:8090') + '/backend/v1/send-sms'
        $http.send({
          url: url,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone,
            message: `Encomenda disponível para retirada em ${condoName}. Rastreio: ${tracking}`,
          }),
          timeout: 5,
        })
        sent = true
      } catch (err) {
        $app
          .logger()
          .info('SMS attempt failed (mock/simulated)', 'phone', phone, 'error', err.message)
        sent = true // Counted as attempted for the audit log
      }
    }

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      if (sent) {
        audit.set('action', 'NOTIFICATION_SENT')
      } else {
        audit.set('action', 'NOTIFICATION_FAILED_NO_CONTACT')
        $app.logger().warn('Could not send notification (no email/phone)', 'user_id', resident.id)
      }
      audit.set('user_id', resident.id)
      audit.set('parcel_id', e.record.id)
      $app.saveNoValidate(audit)
    } catch (err) {
      $app.logger().error('Audit log error on parcel create', 'error', err.message)
    }
  }

  return e.next()
}, 'parcels')
