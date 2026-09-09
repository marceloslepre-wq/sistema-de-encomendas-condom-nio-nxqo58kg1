migrate(
  (app) => {
    // Adicionar campos opcionais em pagamentos_renovacao para rastreamento de PIX
    // tipo_pagamento, qr_code, qr_code_base64
    try {
      const pagCol = app.findCollectionByNameOrId('pagamentos_renovacao')
      if (!pagCol.fields.getByName('tipo_pagamento')) {
        pagCol.fields.add(
          new TextField({
            name: 'tipo_pagamento',
            required: false,
          }),
        )
      }
      if (!pagCol.fields.getByName('qr_code')) {
        pagCol.fields.add(
          new TextField({
            name: 'qr_code',
            required: false,
          }),
        )
      }
      if (!pagCol.fields.getByName('qr_code_base64')) {
        pagCol.fields.add(
          new TextField({
            name: 'qr_code_base64',
            required: false,
          }),
        )
      }
      app.save(pagCol)
    } catch (e) {
      console.log('Erro ao atualizar campos de pagamentos_renovacao:', e)
    }
  },
  (app) => {
    try {
      const pagCol = app.findCollectionByNameOrId('pagamentos_renovacao')
      const f1 = pagCol.fields.getByName('tipo_pagamento')
      if (f1) pagCol.fields.remove(f1)
      const f2 = pagCol.fields.getByName('qr_code')
      if (f2) pagCol.fields.remove(f2)
      const f3 = pagCol.fields.getByName('qr_code_base64')
      if (f3) pagCol.fields.remove(f3)
      app.save(pagCol)
    } catch (_) {}
  },
)
