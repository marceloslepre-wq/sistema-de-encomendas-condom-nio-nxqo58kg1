migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('moradores', "nome ~ 'Marcelo Lepre'", '', 10, 0)
      for (let record of records) {
        const torre = record.getString('torre')
        const apto = record.getString('apartamento')

        const cleanedTorre = torre.replace(/[\s\uFEFF\xA0]+/g, '').trim()
        const cleanedApto = apto.replace(/[\s\uFEFF\xA0]+/g, '').trim()

        record.set('torre', cleanedTorre)
        record.set('apartamento', cleanedApto)
        app.save(record)
      }
    } catch (err) {
      console.log('Error checking data integrity for Marcelo Lepre', err)
    }
  },
  (app) => {
    // no-op
  },
)
