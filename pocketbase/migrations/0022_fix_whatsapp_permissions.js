migrate(
  (app) => {
    const logsCol = app.findCollectionByNameOrId('whatsapp_logs')
    logsCol.createRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    app.save(logsCol)

    const verifCol = app.findCollectionByNameOrId('whatsapp_verifications')
    verifCol.createRule = "@request.auth.id != ''"
    verifCol.listRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    verifCol.viewRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    app.save(verifCol)
  },
  (app) => {
    const logsCol = app.findCollectionByNameOrId('whatsapp_logs')
    logsCol.createRule = null
    app.save(logsCol)

    const verifCol = app.findCollectionByNameOrId('whatsapp_verifications')
    verifCol.createRule = null
    verifCol.listRule = null
    verifCol.viewRule = null
    app.save(verifCol)
  },
)
