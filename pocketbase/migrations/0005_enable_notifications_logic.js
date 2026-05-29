migrate(
  (app) => {
    // Ensure existing condos have notifications_enabled set to true by default,
    // so the feature works out of the box for existing instances.
    app
      .db()
      .newQuery(
        'UPDATE condos SET notifications_enabled = 1 WHERE notifications_enabled IS NULL OR notifications_enabled = 0',
      )
      .execute()
  },
  (app) => {
    // Safe to leave as is on rollback
  },
)
