onRecordAfterDeleteSuccess((e) => {
  try {
    const email = e.record.getString('email')
    const cpf = e.record.getString('cpf')
    const telefone = e.record.getString('telefone')
    const nome = e.record.getString('nome')

    let filterParts = []

    if (email && email.trim() !== '') {
      filterParts.push(`email='${email.replace(/'/g, "''")}'`)
    }
    if (cpf && cpf.trim() !== '') {
      filterParts.push(`cpf='${cpf.replace(/'/g, "''")}'`)
    }
    if (telefone && telefone.trim() !== '') {
      filterParts.push(`phone='${telefone.replace(/'/g, "''")}'`)
    }

    if (filterParts.length > 0) {
      const filter = filterParts.join(' || ')
      try {
        const users = $app.findRecordsByFilter('users', filter, '-created', 10, 0)
        for (const user of users) {
          if (user.getString('role') === 'morador') {
            try {
              $app.delete(user)
            } catch (_) {}
          }
        }
      } catch (err) {}
    }

    let notifFilters = []
    if (nome) notifFilters.push(`morador='${nome.replace(/'/g, "''")}'`)
    if (telefone) notifFilters.push(`celular='${telefone.replace(/'/g, "''")}'`)
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
      } catch (err) {}
    }
  } catch (err) {
    console.log('Error in on_morador_after_delete hook:', err)
  }
  return e.next()
}, 'moradores')
