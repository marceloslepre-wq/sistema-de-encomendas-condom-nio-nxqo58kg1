migrate(
  (app) => {
    const collectionsToRemove = ['whatsapp_logs', 'whatsapp_verifications']

    for (const name of collectionsToRemove) {
      try {
        if (app.hasTable(name)) {
          const col = app.findCollectionByNameOrId(name)
          app.delete(col)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Reverting this migration is not natively supported
  },
)
