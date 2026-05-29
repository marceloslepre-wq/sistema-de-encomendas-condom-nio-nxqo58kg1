onRecordAfterCreateSuccess((e) => {
  const auditCollection = $app.findCollectionByNameOrId('audit_logs')
  const auditRecord = new Record(auditCollection)

  auditRecord.set('action', 'REGISTRO_ENCOMENDA')

  const userId = e.record.get('porter_id') || e.requestInfo().auth?.id || ''
  if (userId) {
    auditRecord.set('user_id', userId)
  }

  auditRecord.set('parcel_id', e.record.id)

  $app.save(auditRecord)
  return e.next()
}, 'parcels')
