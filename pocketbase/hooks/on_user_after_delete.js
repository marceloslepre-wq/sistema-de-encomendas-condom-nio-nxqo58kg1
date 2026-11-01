onRecordAfterDeleteSuccess((e) => {
  try {
    if (e.record.getString('role') === 'morador') {
      const userId = e.record.id

      // Regra 2: NUNCA apagar ENCOMENDAS nem qualquer histórico ao excluir um usuário.
      // Em vez de apagar, DESVINCULAR: o registro da encomenda deve sobreviver
      // (limpar o vínculo morador_id com o usuário, mantendo os dados de texto como o nome do morador gravado),
      // preservando o histórico/auditoria e historico_andamento.
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
            rec.set('morador_id', '')
            $app.save(rec)
          } catch (_) {}
        }
      } catch (_) {}

      // Regra 1: A cascata de exclusão passa a casar SOMENTE por e-mail EXATO
      // Nunca mais por telefone e nunca mais por CPF.
      const email = e.record.getString('email')
      if (email && email.trim() !== '') {
        const escapedEmail = email.trim().replace(/'/g, "''")
        try {
          const moradores = $app.findRecordsByFilter(
            'moradores',
            `email='${escapedEmail}'`,
            '',
            100,
            0,
          )
          for (const m of moradores) {
            try {
              $app.delete(m)
            } catch (_) {}
          }
        } catch (_) {}
      }

      // Regra 3: PRESERVAR as NOTIFICAÇÕES como histórico
      // O hook não apaga mais registros de notificacoes_enviadas.
    }
  } catch (err) {
    console.log('Error in on_user_after_delete hook:', err)
  }
  return e.next()
}, 'users')
