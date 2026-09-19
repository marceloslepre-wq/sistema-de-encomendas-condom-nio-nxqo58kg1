migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Obter o condomínio principal/demonstração existente
    let condoId = ''
    try {
      const condo = app.findFirstRecordByData('condos', 'name', 'Condomínio Residencial Parque')
      if (condo) {
        condoId = condo.id
      }
    } catch (_) {
      try {
        const condos = app.findRecordsByFilter('condos', "id != ''", 'created', 1, 0)
        if (condos && condos.length > 0) {
          condoId = condos[0].id
        }
      } catch (_) {}
    }

    const email = 'marceloslepre@gmail.com'
    const initialPassword = 'Master@Condo2026!#'

    let existingRecord = null
    try {
      existingRecord = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {}

    if (existingRecord) {
      existingRecord.set('name', 'Admin Master')
      existingRecord.set('role', 'master')
      if (condoId) {
        existingRecord.set('condo_id', condoId)
      }
      existingRecord.setVerified(true)
      existingRecord.setPassword(initialPassword)
      app.save(existingRecord)
    } else {
      const newRecord = new Record(users)
      newRecord.setEmail(email)
      newRecord.setPassword(initialPassword)
      newRecord.setVerified(true)
      newRecord.set('name', 'Admin Master')
      newRecord.set('role', 'master')
      if (condoId) {
        newRecord.set('condo_id', condoId)
      }
      newRecord.set('notificacoes_whatsapp', false)
      newRecord.set('permitir_retirada_terceiros', false)
      app.save(newRecord)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
      if (record) {
        app.delete(record)
      }
    } catch (_) {}
  },
)
