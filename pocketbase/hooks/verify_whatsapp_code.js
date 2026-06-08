routerAdd(
  'POST',
  '/backend/v1/verify-whatsapp-code',
  (e) => {
    const body = e.requestInfo().body || {}
    const phone = body.phone
    const code = body.code

    if (typeof phone !== 'string' || !phone.trim() || typeof code !== 'string' || !code.trim()) {
      return e.badRequestError('Phone and code are required')
    }

    const numericPhone = phone.replace(/\D/g, '')
    const exactPhone =
      numericPhone.startsWith('55') && numericPhone.length > 11 ? numericPhone : `55${numericPhone}`

    try {
      // Use PocketBase's @now macro for robust time comparison,
      // avoiding lexicographical issues with 'T' in ISO dates.
      const records = $app.findRecordsByFilter(
        'whatsapp_verifications',
        'phone = {:phone} && verified = false && expires > @now',
        '-created',
        1,
        0,
        { phone: exactPhone },
      )

      if (!records || records.length === 0) {
        return e.badRequestError('Código inválido ou expirado. Tente novamente.')
      }

      const verifRecord = records[0]

      if (verifRecord.getInt('attempts') >= 5) {
        return e.badRequestError('Limite de tentativas excedido. Solicite um novo código.')
      }

      const storedCode = verifRecord.getString('code')

      if (storedCode !== code.trim()) {
        verifRecord.set('attempts', verifRecord.getInt('attempts') + 1)
        $app.save(verifRecord)
        return e.badRequestError('Código inválido ou expirado. Tente novamente.')
      }

      verifRecord.set('verified', true)
      $app.save(verifRecord)

      try {
        const pendingRecebimentos = $app.findRecordsByFilter(
          'recebimentos_auditoria',
          'celular_validacao = {:phone} && status = "ENTRADA_PORTARIA"',
          '-created',
          100,
          0,
          { phone: exactPhone },
        )
        for (const rec of pendingRecebimentos) {
          rec.set('status', 'Validado')
          $app.save(rec)

          try {
            const hist = new Record($app.findCollectionByNameOrId('historico_andamento'))
            hist.set('recebimento_id', rec.id)
            hist.set('status', 'Validado')
            hist.set('observacoes', 'Validado automaticamente via WhatsApp')
            $app.save(hist)
          } catch (histErr) {
            console.log('Failed to create historico_andamento', histErr)
          }
        }
      } catch (err) {
        // no pending records found, proceed
      }

      return e.json(200, { success: true })
    } catch (err) {
      return e.badRequestError('Código inválido. Tente novamente.')
    }
  },
  $apis.requireAuth(),
)
