migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Verificar se o usuário master já existe
    try {
      const existing = app.findAuthRecordByEmail('_pb_users_auth_', 'master@condopack.com')
      if (existing) {
        return // Já existe
      }
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('master@condopack.com')
    record.setPassword('Master@Condo2026!')
    record.setVerified(true)
    record.set('name', 'Marcelo (Master)')
    record.set('role', 'master')
    app.save(record)

    // Seeder adicional: criar planos padrão caso não existam
    try {
      const planosCol = app.findCollectionByNameOrId('planos')
      try {
        app.findFirstRecordByData('planos', 'nome', 'Plano Básico')
      } catch (_) {
        const planoBasico = new Record(planosCol)
        planoBasico.set('nome', 'Plano Básico')
        planoBasico.set('descricao', 'Ideal para condomínios de pequeno porte com 1 torre')
        planoBasico.set('preco_mensal', 199.9)
        planoBasico.set('max_moradores', 100)
        planoBasico.set('max_units', 50)
        planoBasico.set('status', 'ativo')
        planoBasico.set('recursos_liberados', {
          notificacoes_whatsapp: true,
          relatorios_avancados: false,
          triagem_sala: true,
        })
        app.save(planoBasico)
      }

      try {
        app.findFirstRecordByData('planos', 'nome', 'Plano Pro')
      } catch (_) {
        const planoPro = new Record(planosCol)
        planoPro.set('nome', 'Plano Pro')
        planoPro.set('descricao', 'Completo para condomínios médios e grandes com múltiplas torres')
        planoPro.set('preco_mensal', 399.9)
        planoPro.set('max_moradores', 500)
        planoPro.set('max_units', 250)
        planoPro.set('status', 'ativo')
        planoPro.set('recursos_liberados', {
          notificacoes_whatsapp: true,
          relatorios_avancados: true,
          triagem_sala: true,
          multiplos_porteiros: true,
        })
        app.save(planoPro)
      }
    } catch (e) {
      console.log('Erro ao criar planos padrão:', e)
    }

    // Vincular o condomínio existente ao Plano Pro como licença inicial ativa
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      const condosCol = app.findCollectionByNameOrId('condos')
      const planosCol = app.findCollectionByNameOrId('planos')

      const condo = app.findFirstRecordByData('condos', 'name', 'Condomínio Residencial Parque')
      const plano = app.findFirstRecordByData('planos', 'nome', 'Plano Pro')

      try {
        app.findFirstRecordByData('licencas', 'condo_id', condo.id)
      } catch (_) {
        const licenca = new Record(licencasCol)
        licenca.set('condo_id', condo.id)
        licenca.set('plano_id', plano.id)
        licenca.set('status', 'ativa')
        licenca.set('data_expiracao', '2027-12-31 23:59:59.000Z')
        app.save(licenca)
      }
    } catch (e) {
      console.log('Erro ao criar licença inicial:', e)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'master@condopack.com')
      if (record) app.delete(record)
    } catch (_) {}
  },
)
