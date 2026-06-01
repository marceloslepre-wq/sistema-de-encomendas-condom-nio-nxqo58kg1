migrate(
  (app) => {
    const collectionsToDrop = [
      'whatsapp_logs',
      'sms_verifications',
      'whatsapp_verifications',
      'notification_templates',
    ]

    for (const name of collectionsToDrop) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) app.delete(col)
      } catch (_) {}
    }

    try {
      const condos = app.findCollectionByNameOrId('condos')
      condos.fields.removeByName('exige_validacao_whatsapp')
      condos.fields.removeByName('notifications_enabled')
      app.save(condos)
    } catch (_) {}

    try {
      const recebimentos = app.findCollectionByNameOrId('recebimentos_auditoria')
      recebimentos.fields.removeByName('codigo_enviado')
      recebimentos.fields.removeByName('codigo_validado')
      app.save(recebimentos)
    } catch (_) {}

    try {
      const parcels = app.findCollectionByNameOrId('parcels')
      parcels.fields.removeByName('withdrawal_code')
      parcels.removeIndex('idx_parcels_withdrawal')
      app.save(parcels)
    } catch (_) {}
  },
  (app) => {},
)
