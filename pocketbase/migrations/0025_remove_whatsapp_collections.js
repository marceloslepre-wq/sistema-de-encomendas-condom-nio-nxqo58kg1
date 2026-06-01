migrate(
  (app) => {
    try {
      const logs = app.findCollectionByNameOrId('whatsapp_logs')
      app.delete(logs)
    } catch (_) {}

    try {
      const verif = app.findCollectionByNameOrId('whatsapp_verifications')
      app.delete(verif)
    } catch (_) {}
  },
  (app) => {
    // Reverting this migration is not natively supported without redefining the collections
  },
)
