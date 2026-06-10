onRecordAfterDeleteSuccess((e) => {
  if (e.record.getString('role') !== 'morador') return e.next()

  try {
    const userId = e.record.id
    const email = e.record.getString('email')
    const cpf = e.record.getString('cpf')
    const phone = e.record.getString('phone')
    const name = e.record.getString('name')

    try {
      const recebimentos = $app.findRecordsByFilter(
        'recebimentos_auditoria',
        `morador_id = '${userId}'`,
        '',
        1000,
        0,
      )
      for (const rec of recebimentos) {
        try {
          const historicos = $app.findRecordsByFilter(
            'historico_andamento',
            `recebimento_id = '${rec.id}'`,
            '',
            1000,
            0,
          )
          for (const hist of historicos) {
            try {
              $app.delete(hist)
            } catch (_) {}
          }
          $app.delete(rec)
        } catch (_) {}
      }
    } catch (err) {}

    let moradorFilters = []
    if (email) moradorFilters.push(`email='${email.replace(/'/g, "''")}'`)
    if (cpf) moradorFilters.push(`cpf='${cpf.replace(/'/g, "''")}'`)
    if (moradorFilters.length > 0) {
      try {
        const filter = moradorFilters.join(' || ')
        const moradores = $app.findRecordsByFilter('moradores', filter, '', 100, 0)
        for (const m of moradores) {
          try {
            $app.delete(m)
          } catch (_) {}
        }
      } catch (err) {}
    }

    let notifFilters = []
    if (name) notifFilters.push(`morador='${name.replace(/'/g, "''")}'`)
    if (phone) notifFilters.push(`celular='${phone.replace(/'/g, "''")}'`)
    if (notifFilters.length > 0) {
      try {
        const filter = notifFilters.join(' || ')
        const notificacoes = $app.findRecordsByFilter('notificacoes_enviadas', filter, '', 1000, 0)
        for (const n of notificacoes) {
          try {
            $app.delete(n)
          } catch (_) {}
        }
      } catch (err) {}
    }
  } catch (err) {
    console.log('Error in on_user_after_delete hook:', err)
  }

  return e.next()
}, 'users')
