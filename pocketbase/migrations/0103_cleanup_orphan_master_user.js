migrate(
  (app) => {
    // 1. Localizar referências e limpar para qualquer usuário com role=master que NÃO seja marceloslepre@gmail.com
    const masterUsers = app.findRecordsByFilter('users', "role = 'master'", '', 100, 0)
    const validMasterId = 'wstm84w5cjjipgi'
    const validMasterEmail = 'marceloslepre@gmail.com'

    // Garantir que o usuário master oficial está vinculado ao condomínio do Parque (cjvbjhk0senz1yt)
    try {
      const officialMaster = app.findAuthRecordByEmail('_pb_users_auth_', validMasterEmail)
      if (officialMaster) {
        officialMaster.set('condo_id', 'cjvbjhk0senz1yt')
        officialMaster.set('role', 'master')
        app.save(officialMaster)
      }
    } catch (_) {}

    for (const u of masterUsers) {
      if (u.id === validMasterId || u.getString('email') === validMasterEmail) {
        continue
      }

      const orphanId = u.id

      // 2. Limpar referências em recebimentos_auditoria (morador_id ou recebido_por)
      try {
        const recebimentos = app.findRecordsByFilter(
          'recebimentos_auditoria',
          `morador_id = '${orphanId}' || recebido_por = '${orphanId}'`,
          '',
          1000,
          0,
        )
        for (const r of recebimentos) {
          if (r.getString('morador_id') === orphanId) {
            r.set('morador_id', '')
          }
          if (r.getString('recebido_por') === orphanId) {
            r.set('recebido_por', '')
          }
          app.save(r)
        }
      } catch (err) {
        console.log('Erro ao limpar recebimentos_auditoria do user orphan:', err)
      }

      // 3. Excluir o usuário não oficial
      try {
        app.delete(u)
      } catch (err) {
        console.log('Erro ao excluir usuário master orphan:', orphanId, err)
      }
    }
  },
  (app) => {
    // Reverter limpeza não é aplicável para exclusão de dados inconsistentes
  },
)
