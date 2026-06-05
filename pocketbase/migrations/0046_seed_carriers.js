migrate(
  (app) => {
    const carriers = ['Sedex', 'Mercado Livre', 'Loggi', 'Total Express']
    const col = app.findCollectionByNameOrId('carriers')

    for (const name of carriers) {
      try {
        app.findFirstRecordByData('carriers', 'name', name)
      } catch (_) {
        const record = new Record(col)
        record.set('name', name)
        app.save(record)
      }
    }
  },
  (app) => {
    const carriers = ['Sedex', 'Mercado Livre', 'Loggi', 'Total Express']
    for (const name of carriers) {
      try {
        const record = app.findFirstRecordByData('carriers', 'name', name)
        app.delete(record)
      } catch (_) {}
    }
  },
)
