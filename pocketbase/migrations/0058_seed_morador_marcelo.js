migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    const setupMorador = (email, password, nome, cpf, torre, apartamento, telefone) => {
      let userRecord
      try {
        userRecord = app.findAuthRecordByEmail('users', email)
        if (
          userRecord.getString('role') !== 'morador' &&
          userRecord.getString('role') !== 'gestor'
        ) {
          userRecord.set('role', 'morador')
          app.save(userRecord)
        }
      } catch (_) {
        userRecord = new Record(users)
        userRecord.setEmail(email)
        userRecord.setPassword(password)
        userRecord.setVerified(true)
        userRecord.set('name', nome)
        userRecord.set('role', 'morador')
        app.save(userRecord)
      }

      const moradores = app.findCollectionByNameOrId('moradores')
      try {
        app.findFirstRecordByData('moradores', 'email', email)
      } catch (_) {
        const morador = new Record(moradores)
        morador.set('nome', nome)
        morador.set('email', email)
        morador.set('cpf', cpf)
        morador.set('torre', torre)
        morador.set('apartamento', apartamento)
        morador.set('telefone', telefone)
        app.save(morador)
      }
    }

    setupMorador(
      'marcelolepre@hotmail.com',
      'Skip@Pass',
      'Marcelo Lepre',
      '000.000.000-00',
      'A',
      '101',
      '(11) 99999-9999',
    )
    setupMorador(
      'morador@email.com',
      'senha123',
      'Morador Teste',
      '111.111.111-11',
      'B',
      '202',
      '(11) 98888-8888',
    )
  },
  (app) => {},
)
