migrate(
  (app) => {
    const recebimentos = app.findCollectionByNameOrId('recebimentos_auditoria')
    const historico = app.findCollectionByNameOrId('historico_andamento')

    const seedParcel = (email, nome, unidade) => {
      let user
      try {
        user = app.findAuthRecordByEmail('users', email)
      } catch (_) {
        return
      }

      const rastreio = 'BR' + email.substring(0, 4).toUpperCase() + '123'

      try {
        app.findFirstRecordByData('recebimentos_auditoria', 'codigo_rastreio', rastreio)
        return
      } catch (_) {}

      const rec = new Record(recebimentos)
      rec.set('morador_id', user.id)
      rec.set('morador', nome)
      rec.set('unidade', unidade)
      rec.set('volume', 'Caixa Média')
      rec.set('transportadora', 'Correios')
      rec.set('status', 'RECEBIDO')
      rec.set('codigo_rastreio', rastreio)
      rec.set('codigo_validacao', '123456')
      rec.set('observacoes', 'Entregue na portaria')
      app.save(rec)

      const hist = new Record(historico)
      hist.set('recebimento_id', rec.id)
      hist.set('status', 'RECEBIDO')
      hist.set('observacoes', 'Pacote recebido pelo porteiro')
      app.save(hist)
    }

    seedParcel('marcelolepre@hotmail.com', 'Marcelo Lepre', 'A-101')
    seedParcel('morador@email.com', 'Morador Teste', 'B-202')
  },
  (app) => {},
)
