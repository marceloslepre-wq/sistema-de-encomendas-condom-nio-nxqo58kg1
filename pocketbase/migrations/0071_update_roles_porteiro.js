migrate(
  (app) => {
    const collections = [
      'recebimentos_auditoria',
      'units',
      'condos',
      'templates_notificacao',
      'notificacoes_enviadas',
      'moradores',
      'historico_andamento',
      'whatsapp_verifications',
    ]

    collections.forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name)

        const updateRule = (rule) => {
          if (!rule) return rule
          if (rule.includes("'portaria'") && !rule.includes("'porteiro'")) {
            return rule.replace(/'portaria'/g, "'portaria' || @request.auth.role = 'porteiro'")
          }
          return rule
        }

        col.listRule = updateRule(col.listRule)
        col.viewRule = updateRule(col.viewRule)
        col.createRule = updateRule(col.createRule)
        col.updateRule = updateRule(col.updateRule)
        col.deleteRule = updateRule(col.deleteRule)

        app.save(col)
      } catch (e) {
        console.log('Skipping ' + name, e)
      }
    })
  },
  (app) => {
    const collections = [
      'recebimentos_auditoria',
      'units',
      'condos',
      'templates_notificacao',
      'notificacoes_enviadas',
      'moradores',
      'historico_andamento',
      'whatsapp_verifications',
    ]

    collections.forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name)

        const updateRule = (rule) => {
          if (!rule) return rule
          return rule.replace(/ \|\| @request\.auth\.role = 'porteiro'/g, '')
        }

        col.listRule = updateRule(col.listRule)
        col.viewRule = updateRule(col.viewRule)
        col.createRule = updateRule(col.createRule)
        col.updateRule = updateRule(col.updateRule)
        col.deleteRule = updateRule(col.deleteRule)

        app.save(col)
      } catch (e) {
        console.log('Skipping ' + name, e)
      }
    })
  },
)
