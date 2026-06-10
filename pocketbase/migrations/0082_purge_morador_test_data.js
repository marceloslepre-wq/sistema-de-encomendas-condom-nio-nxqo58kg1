migrate(
  (app) => {
    try {
      const moradores = app.findRecordsByFilter('moradores', '1=1', '', 10000, 0)
      for (const m of moradores) {
        try {
          app.delete(m)
        } catch (_) {}
      }
    } catch (_) {}

    try {
      const users = app.findRecordsByFilter('_pb_users_auth_', "role = 'morador'", '', 10000, 0)
      for (const u of users) {
        try {
          const recs = app.findRecordsByFilter(
            'recebimentos_auditoria',
            `morador_id = '${u.id}'`,
            '',
            10000,
            0,
          )
          for (const r of recs) {
            try {
              const hists = app.findRecordsByFilter(
                'historico_andamento',
                `recebimento_id = '${r.id}'`,
                '',
                10000,
                0,
              )
              for (const h of hists) {
                try {
                  app.delete(h)
                } catch (_) {}
              }
              app.delete(r)
            } catch (_) {}
          }
        } catch (_) {}

        try {
          const name = u.getString('name')
          const phone = u.getString('phone')
          let notifFilters = []
          if (name) notifFilters.push(`morador='${name.replace(/'/g, "''")}'`)
          if (phone) notifFilters.push(`celular='${phone.replace(/'/g, "''")}'`)
          if (notifFilters.length > 0) {
            const notificacoes = app.findRecordsByFilter(
              'notificacoes_enviadas',
              notifFilters.join(' || '),
              '',
              10000,
              0,
            )
            for (const n of notificacoes) {
              try {
                app.delete(n)
              } catch (_) {}
            }
          }
        } catch (_) {}

        try {
          app.delete(u)
        } catch (_) {}
      }
    } catch (_) {}
  },
  (app) => {
    // Purge is destructive; cannot easily revert
  },
)
