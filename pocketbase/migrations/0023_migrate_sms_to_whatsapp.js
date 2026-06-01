migrate(
  (app) => {
    const condos = app.findCollectionByNameOrId('condos')
    const field = condos.fields.getByName('exige_validacao_sms')
    if (field) {
      field.name = 'exige_validacao_whatsapp'
      app.save(condos)
    }

    const wVerif = app.findCollectionByNameOrId('whatsapp_verifications')
    wVerif.listRule =
      "@request.auth.role = 'portaria' || @request.auth.role = 'gestor' || @request.auth.role = 'triagem'"
    wVerif.viewRule =
      "@request.auth.role = 'portaria' || @request.auth.role = 'gestor' || @request.auth.role = 'triagem'"
    app.save(wVerif)

    const wLogs = app.findCollectionByNameOrId('whatsapp_logs')
    wLogs.listRule =
      "@request.auth.role = 'portaria' || @request.auth.role = 'gestor' || @request.auth.role = 'triagem'"
    wLogs.viewRule =
      "@request.auth.role = 'portaria' || @request.auth.role = 'gestor' || @request.auth.role = 'triagem'"
    wLogs.createRule =
      "@request.auth.role = 'portaria' || @request.auth.role = 'gestor' || @request.auth.role = 'triagem'"
    app.save(wLogs)
  },
  (app) => {
    const condos = app.findCollectionByNameOrId('condos')
    const field = condos.fields.getByName('exige_validacao_whatsapp')
    if (field) {
      field.name = 'exige_validacao_sms'
      app.save(condos)
    }

    const wVerif = app.findCollectionByNameOrId('whatsapp_verifications')
    wVerif.listRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    wVerif.viewRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    app.save(wVerif)

    const wLogs = app.findCollectionByNameOrId('whatsapp_logs')
    wLogs.listRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    wLogs.viewRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    wLogs.createRule = "@request.auth.role = 'portaria' || @request.auth.role = 'gestor'"
    app.save(wLogs)
  },
)
