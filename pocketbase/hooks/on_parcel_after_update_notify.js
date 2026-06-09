onRecordAfterUpdateSuccess((e) => {
  const newStatus = e.record.getString('status')
  const oldStatus = e.record.original().getString('status')

  if (newStatus === oldStatus) {
    return e.next()
  }

  const unitId = e.record.getString('unit_id')
  if (!unitId) return e.next()

  let unit, condo
  try {
    unit = $app.findRecordById('units', unitId)
    condo = $app.findRecordById('condos', unit.getString('condo_id'))
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

  let templateMessage = `Sua encomenda (Rastreio: {tracking}) atualizou o status para ${newStatus}.`
  try {
    const template = $app.findFirstRecordByData('notification_templates', 'status', newStatus)
    templateMessage = template.getString('message')
  } catch (_) {}

  for (const resident of residents) {
    const email = resident.getString('email')
    const phone = resident.getString('phone')
    const tracking = e.record.getString('tracking_code') || 'N/A'
    const condoName = condo.getString('name')
    const code = e.record.getString('withdrawal_code') || ''

    const message = templateMessage
      .replace(/{name}/g, resident.getString('name') || 'Morador')
      .replace(/{tracking}/g, tracking)
      .replace(/{code}/g, code)
      .replace(/{condoName}/g, condoName)

    let sent = false

    if (email) {
      try {
        const mail = new mailer.Message({
          from: { address: 'noreply@condominio.com', name: condoName },
          to: [{ address: email }],
          subject: `Atualização de Encomenda - ${condoName}`,
          html: `<p>${message}</p>`,
        })
        $app.newMailClient().send(mail)
        sent = true
      } catch (err) {
        $app.logger().error('Email error on parcel update', 'error', err.message)
      }
    }

    if (!email && !phone) {
      $app
        .logger()
        .info('Notification skipped: no contact info (email/phone)', 'resident_id', resident.id)
    }

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      if (sent) {
        audit.set('action', 'NOTIFICATION_SENT')
      } else {
        audit.set('action', 'NOTIFICATION_FAILED_NO_CONTACT')
      }
      audit.set('user_id', resident.id)
      audit.set('parcel_id', e.record.id)
      $app.saveNoValidate(audit)
    } catch (err) {}
  }

  return e.next()
}, 'parcels')
