migrate(
  (app) => {
    // 1. Specific deletion for Unit "A-102" and resident "Jonas"
    try {
      const jonasRecords = app.findRecordsByFilter(
        'recebimentos_auditoria',
        "unidade ~ 'A-102' && morador ~ 'Jonas'",
        '',
        100,
        0,
      )
      for (const rec of jonasRecords) {
        try {
          app.delete(rec)
        } catch (_) {}
      }
    } catch (_) {}

    const limit = 100

    // 2. Collect and delete orphaned recebimentos_auditoria
    let offset = 0
    let toDeleteIds = []

    while (true) {
      try {
        const records = app.findRecordsByFilter('recebimentos_auditoria', '1=1', '', limit, offset)
        if (records.length === 0) break

        for (const rec of records) {
          let shouldDelete = false
          const moradorId = rec.getString('morador_id')
          const moradorNome = rec.getString('morador')

          if (moradorId) {
            try {
              app.findRecordById('users', moradorId)
            } catch (_) {
              shouldDelete = true
            }
          } else if (moradorNome) {
            try {
              const u = app.findRecordsByFilter(
                'users',
                `name = '${moradorNome.replace(/'/g, "''")}' && role = 'morador'`,
                '',
                1,
                0,
              )
              const m = app.findRecordsByFilter(
                'moradores',
                `nome = '${moradorNome.replace(/'/g, "''")}'`,
                '',
                1,
                0,
              )
              if (u.length === 0 && m.length === 0) {
                shouldDelete = true
              }
            } catch (_) {
              shouldDelete = true
            }
          }

          if (shouldDelete) {
            toDeleteIds.push(rec.id)
          }
        }
        offset += limit
      } catch (_) {
        break
      }
    }

    for (const id of toDeleteIds) {
      try {
        const rec = app.findRecordById('recebimentos_auditoria', id)
        app.delete(rec)
      } catch (_) {}
    }

    // 3. Clean historico_andamento
    offset = 0
    toDeleteIds = []
    while (true) {
      try {
        const records = app.findRecordsByFilter('historico_andamento', '1=1', '', limit, offset)
        if (records.length === 0) break

        for (const rec of records) {
          const recId = rec.getString('recebimento_id')
          if (recId) {
            try {
              app.findRecordById('recebimentos_auditoria', recId)
            } catch (_) {
              toDeleteIds.push(rec.id)
            }
          } else {
            toDeleteIds.push(rec.id)
          }
        }
        offset += limit
      } catch (_) {
        break
      }
    }

    for (const id of toDeleteIds) {
      try {
        const rec = app.findRecordById('historico_andamento', id)
        app.delete(rec)
      } catch (_) {}
    }

    // 4. Clean notificacoes_enviadas
    offset = 0
    toDeleteIds = []
    while (true) {
      try {
        const records = app.findRecordsByFilter('notificacoes_enviadas', '1=1', '', limit, offset)
        if (records.length === 0) break

        for (const rec of records) {
          const moradorNome = rec.getString('morador')
          if (moradorNome) {
            try {
              const u = app.findRecordsByFilter(
                'users',
                `name = '${moradorNome.replace(/'/g, "''")}' && role = 'morador'`,
                '',
                1,
                0,
              )
              const m = app.findRecordsByFilter(
                'moradores',
                `nome = '${moradorNome.replace(/'/g, "''")}'`,
                '',
                1,
                0,
              )
              if (u.length === 0 && m.length === 0) {
                toDeleteIds.push(rec.id)
              }
            } catch (_) {}
          }
        }
        offset += limit
      } catch (_) {
        break
      }
    }

    for (const id of toDeleteIds) {
      try {
        const rec = app.findRecordById('notificacoes_enviadas', id)
        app.delete(rec)
      } catch (_) {}
    }
  },
  (app) => {},
)
