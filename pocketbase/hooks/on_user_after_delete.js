onRecordAfterDeleteSuccess((e) => {
  try {
    if (e.record.getString('role') === 'morador') {
      const userId = e.record.id

      // Delete recebimentos_auditoria
      try {
        const recebimentos = $app.findRecordsByFilter(
          'recebimentos_auditoria',
          `morador_id='${userId}'`,
          '',
          1000,
          0,
        )
        for (const rec of recebimentos) {
          try {
            const recId = rec.id
            $app.delete(rec)
            // Cascade delete historico_andamento
            try {
              const historico = $app.findRecordsByFilter(
                'historico_andamento',
                `recebimento_id='${recId}'`,
                '',
                100,
                0,
              )
              for (const h of historico) {
                try {
                  $app.delete(h)
                } catch (_) {}
              }
            } catch (_) {}
          } catch (_) {}
        }
      } catch (_) {}

      // Delete from moradores
      const email = e.record.getString('email')
      const cpf = e.record.getString('cpf')
      if (cpf || email) {
        let filters = []
        if (cpf && cpf.trim() !== '') filters.push(`cpf='${cpf.replace(/'/g, "''")}'`)
        if (email && email.trim() !== '') filters.push(`email='${email.replace(/'/g, "''")}'`)
        if (filters.length > 0) {
          try {
            const filterStr = filters.join(' || ')
            const moradores = $app.findRecordsByFilter('moradores', filterStr, '', 100, 0)
            for (const m of moradores) {
              try {
                $app.delete(m)
              } catch (_) {}
            }
          } catch (_) {}
        }
      }

      // Delete notificacoes_enviadas
      const nome = e.record.getString('name')
      const telefone = e.record.getString('phone')
      let notifFilters = []
      if (nome && nome.trim() !== '') notifFilters.push(`morador='${nome.replace(/'/g, "''")}'`)
      if (telefone && telefone.trim() !== '')
        notifFilters.push(`celular='${telefone.replace(/'/g, "''")}'`)
      if (notifFilters.length > 0) {
        try {
          const notificacoes = $app.findRecordsByFilter(
            'notificacoes_enviadas',
            notifFilters.join(' || '),
            '',
            1000,
            0,
          )
          for (const n of notificacoes) {
            try {
              $app.delete(n)
            } catch (_) {}
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.log('Error in on_user_after_delete hook:', err)
  }
  return e.next()
}, 'users')
