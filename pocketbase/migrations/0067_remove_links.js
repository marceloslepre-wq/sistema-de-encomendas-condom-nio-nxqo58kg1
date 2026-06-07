migrate(
  (app) => {
    try {
      const invCol = app.findCollectionByNameOrId('invitation_links')
      app.delete(invCol)
    } catch (_) {}

    try {
      const genCol = app.findCollectionByNameOrId('generated_links')
      app.delete(genCol)
    } catch (_) {}

    console.log("Tabela 'links' removida do banco")
  },
  (app) => {
    // Collection removed, no easy rollback without full schema definition
  },
)
