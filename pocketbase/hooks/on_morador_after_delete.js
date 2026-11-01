onRecordAfterDeleteSuccess((e) => {
  try {
    const email = e.record.getString('email')

    // Regra 1: A cascata de exclusão passa a casar SOMENTE por e-mail EXATO
    // Nunca mais por telefone e nunca mais por CPF.
    if (email && email.trim() !== '') {
      const escapedEmail = email.trim().replace(/'/g, "''")
      try {
        const users = $app.findRecordsByFilter(
          'users',
          `email='${escapedEmail}'`,
          '-created',
          10,
          0,
        )
        for (const user of users) {
          if (user.getString('role') === 'morador') {
            try {
              $app.delete(user)
            } catch (_) {}
          }
        }
      } catch (err) {}
    }

    // Regra 3: PRESERVAR as NOTIFICAÇÕES como histórico
    // O hook não apaga mais registros de notificacoes_enviadas.
  } catch (err) {
    console.log('Error in on_morador_after_delete hook:', err)
  }
  return e.next()
}, 'moradores')
