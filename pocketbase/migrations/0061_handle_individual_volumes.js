migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let resident
    try {
      resident = app.findAuthRecordByEmail('_pb_users_auth_', 'marceloslepre@gmail.com')
    } catch (_) {
      resident = new Record(users)
      resident.setEmail('marceloslepre@gmail.com')
      resident.setPassword('Skip@Pass')
      resident.setVerified(true)
      resident.set('name', 'Marcelo Morador')
      resident.set('role', 'morador')
      app.save(resident)
    }

    const recCol = app.findCollectionByNameOrId('recebimentos_auditoria')

    try {
      app.findFirstRecordByData('recebimentos_auditoria', 'codigo_rastreio', 'TEST-HIST-001')
    } catch (_) {
      const histRec = new Record(recCol)
      histRec.set('unidade', 'Apt 101')
      histRec.set('morador', 'Marcelo')
      histRec.set('morador_id', resident.id)
      histRec.set('volume', '1/1')
      histRec.set('transportadora', 'Correios')
      histRec.set('status', 'RETIRADO')
      histRec.set('codigo_rastreio', 'TEST-HIST-001')
      histRec.set('codigo_validacao', '123456')
      app.save(histRec)

      const histAndCol = app.findCollectionByNameOrId('historico_andamento')
      const stages = [
        { status: 'ENTRADA_PORTARIA', obs: 'Recebido na portaria' },
        { status: 'Em sala de encomendas', obs: 'Volume recebido na sala de encomendas' },
        { status: 'LIBERADO_RETIRADA', obs: 'Liberado' },
        { status: 'RETIRADO', obs: 'Entregue ao morador' },
      ]
      for (const st of stages) {
        const h = new Record(histAndCol)
        h.set('recebimento_id', histRec.id)
        h.set('status', st.status)
        h.set('observacoes', st.obs)
        app.save(h)
      }
    }

    try {
      app.findFirstRecordByData('recebimentos_auditoria', 'codigo_rastreio', 'TEST-MULTI-002')
    } catch (_) {
      const multiRec = new Record(recCol)
      multiRec.set('unidade', 'Apt 101')
      multiRec.set('morador', 'Marcelo')
      multiRec.set('morador_id', resident.id)
      multiRec.set('volume', '3')
      multiRec.set('transportadora', 'Amazon')
      multiRec.set('status', 'ENTRADA_PORTARIA')
      multiRec.set('codigo_rastreio', 'TEST-MULTI-002')
      app.save(multiRec)

      const histAndCol = app.findCollectionByNameOrId('historico_andamento')
      const h = new Record(histAndCol)
      h.set('recebimento_id', multiRec.id)
      h.set('status', 'ENTRADA_PORTARIA')
      h.set('observacoes', 'Recebido na portaria')
      app.save(h)
    }
  },
  (app) => {
    // no-op
  },
)
