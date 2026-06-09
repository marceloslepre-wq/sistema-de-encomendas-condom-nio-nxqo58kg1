onRecordAfterDeleteSuccess((e) => {
  try {
    const email = e.record.getString('email')
    const cpf = e.record.getString('cpf')
    const telefone = e.record.getString('telefone')

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
      const users = $app.findRecordsByFilter('users', filter, '-created', 10, 0)

      for (const user of users) {
        if (user.getString('role') === 'morador') {
          $app.delete(user)
        }
      }
    }
  } catch (err) {
    console.log('Error in on_morador_after_delete hook:', err)
  }
  return e.next()
}, 'moradores')
