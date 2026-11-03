migrate(
  (app) => {
    try {
      app
        .db()
        .newQuery("UPDATE planos SET nome = 'Plano Platinum' WHERE nome = 'Plano Pratinum'")
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      app
        .db()
        .newQuery("UPDATE planos SET nome = 'Plano Pratinum' WHERE nome = 'Plano Platinum'")
        .execute()
    } catch (_) {}
  },
)
