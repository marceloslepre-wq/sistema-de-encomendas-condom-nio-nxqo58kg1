onRecordAfterUpdateSuccess((e) => {
  const newStatus = e.record.getString('status')
  const oldStatus = e.record.original().getString('status')

  if (newStatus !== oldStatus) {
    const auditCollection = $app.findCollectionByNameOrId('audit_logs')
    const auditRecord = new Record(auditCollection)
    auditRecord.set('action', `STATUS_UPDATED_TO_${newStatus}`)
    const userId = e.requestInfo().auth?.id || ''
    if (userId) {
      auditRecord.set('user_id', userId)
    }
    auditRecord.set('parcel_id', e.record.id)
    $app.saveNoValidate(auditRecord)
  }
  return e.next()
}, 'parcels')
