migrate(
  (app) => {
    const collections = ['recebimentos_auditoria', 'historico_andamento']

    collections.forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name)

        const ensurePorteiro = (rule) => {
          if (!rule) return rule
          if (rule.includes("'portaria'") && !rule.includes("'porteiro'")) {
            return rule.replace(/'portaria'/g, "'portaria' || @request.auth.role = 'porteiro'")
          }
          return rule
        }

        col.listRule = ensurePorteiro(col.listRule)
        col.viewRule = ensurePorteiro(col.viewRule)
        col.createRule = ensurePorteiro(col.createRule)
        col.updateRule = ensurePorteiro(col.updateRule)
        col.deleteRule = ensurePorteiro(col.deleteRule)

        app.save(col)
      } catch (e) {
        console.log('Error updating ' + name, e)
      }
    })
  },
  (app) => {
    const collections = ['recebimentos_auditoria', 'historico_andamento']

    collections.forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name)

        const revertPorteiro = (rule) => {
          if (!rule) return rule
          return rule.replace(/ \|\| @request\.auth\.role = 'porteiro'/g, '')
        }

        col.listRule = revertPorteiro(col.listRule)
        col.viewRule = revertPorteiro(col.viewRule)
        col.createRule = revertPorteiro(col.createRule)
        col.updateRule = revertPorteiro(col.updateRule)
        col.deleteRule = revertPorteiro(col.deleteRule)

        app.save(col)
      } catch (e) {
        console.log('Skipping revert for ' + name, e)
      }
    })
  },
)
