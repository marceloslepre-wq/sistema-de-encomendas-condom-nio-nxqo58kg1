// Integração de Pagamento de Renovação (Mercado Pago Checkout Pro)
// Endpoint para criar preferência de pagamento e webhook para retorno e confirmação automática

routerAdd('POST', '/backend/v1/pagamento/renovar', (e) => {
  const auth = e.requestInfo().authRecord
  if (!auth) {
    return e.forbiddenError('Não autenticado.')
  }

  const role = auth.getString('role')
  const userCondoId = auth.getString('condo_id')

  if (!userCondoId && role !== 'master') {
    return e.badRequestError('Usuário não está vinculado a um condomínio.')
  }

  const mpToken =
    $secrets.get('MERCADO_PAGO_ACCESS_TOKEN') || $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
  if (!mpToken) {
    return e.json(200, {
      configured: false,
      message:
        'Gateway de pagamento Mercado Pago em fase de configuração. Entre em contato com o suporte ou administrador master para renovar sua licença.',
    })
  }

  try {
    const licencaList = $app.findRecordsByFilter(
      'licencas',
      `condo_id = '${userCondoId}'`,
      '-created',
      1,
    )

    if (licencaList.length === 0) {
      return e.badRequestError('Licença não encontrada para este condomínio.')
    }

    const licenca = licencaList[0]
    const planoId = licenca.getString('plano_id')
    if (!planoId) {
      return e.badRequestError('Nenhum plano associado à licença para renovação.')
    }

    const plano = $app.findRecordById('planos', planoId)
    const condo = $app.findRecordById('condos', userCondoId)

    const precoMensal = plano.getInt('preco_mensal') || 199.9
    const planoNome = plano.getString('nome') || 'Plano Mensal'
    const condoName = condo.getString('name') || 'Condomínio'

    // Obter URL do frontend e backend
    const siteUrl =
      $os.getenv('SITE_URL') ||
      $secrets.get('SITE_URL') ||
      'https://sistema-de-encomendas-condominio-03d6a.shrd00.internal.goskip.dev'
    const backSuccess = `${siteUrl}/renovar?status=aprovado`
    const backPending = `${siteUrl}/renovar?status=pendente`
    const backFailure = `${siteUrl}/renovar?status=falha`

    const webhookUrl = `${siteUrl}/backend/v1/pagamento/webhook`

    // Montar payload da Preferência do Mercado Pago
    const preferencePayload = {
      items: [
        {
          id: `renovacao_${licenca.id}`,
          title: `Renovação de Assinatura 30 dias - ${planoNome} (${condoName})`,
          description: `Renovação por 30 dias do sistema de encomendas CondoPack para ${condoName}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(precoMensal),
        },
      ],
      payer: {
        name: auth.getString('name') || condoName,
        email: auth.getString('email'),
      },
      back_urls: {
        success: backSuccess,
        pending: backPending,
        failure: backFailure,
      },
      auto_return: 'approved',
      notification_url: webhookUrl,
      external_reference: JSON.stringify({
        condo_id: userCondoId,
        licenca_id: licenca.id,
        plano_id: plano.id,
      }),
    }

    const response = $http.send({
      url: 'https://api.mercadopago.com/checkout/preferences',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify(preferencePayload),
      timeout: 20,
    })

    let rawBody = ''
    try {
      if (response.body) {
        rawBody = new TextDecoder().decode(response.body)
      }
    } catch (_) {
      rawBody = String(response.body || '')
    }

    const resJson = JSON.parse(rawBody || '{}')

    if (response.statusCode >= 200 && response.statusCode < 300 && resJson.id) {
      // Registrar intenção de pagamento na coleção pagamentos_renovacao
      try {
        const pagCol = $app.findCollectionByNameOrId('pagamentos_renovacao')
        const pagRecord = new Record(pagCol)
        pagRecord.set('condo_id', userCondoId)
        pagRecord.set('licenca_id', licenca.id)
        pagRecord.set('plano_id', plano.id)
        pagRecord.set('preference_id', resJson.id)
        pagRecord.set('status', 'pending')
        pagRecord.set('valor', Number(precoMensal))
        pagRecord.set('detalhes', { init_point: resJson.init_point })
        $app.saveNoValidate(pagRecord)
      } catch (logErr) {
        $app
          .logger()
          .error('Erro ao registrar log de pagamento:', 'error', logErr.message || logErr)
      }

      return e.json(200, {
        configured: true,
        preference_id: resJson.id,
        init_point: resJson.init_point,
        sandbox_init_point: resJson.sandbox_init_point,
        valor: precoMensal,
        plano_nome: planoNome,
      })
    } else {
      $app
        .logger()
        .error(
          'Erro retornado pela API do Mercado Pago:',
          'statusCode',
          response.statusCode,
          'body',
          rawBody,
        )
      return e.badRequestError(
        'Erro ao comunicar com Mercado Pago: ' + (resJson.message || 'Falha ao gerar cobrança.'),
      )
    }
  } catch (err) {
    return e.badRequestError('Erro ao processar renovação: ' + (err.message || err))
  }
})

// Webhook Mercado Pago para confirmação automática de pagamento e reativação por +30 dias
routerAdd('POST', '/backend/v1/pagamento/webhook', (e) => {
  const query = e.requestInfo().query || {}
  const body = e.requestInfo().body || {}

  const topic = query.topic || body.type || query.type || ''
  const paymentId = (body.data && body.data.id) || query.id || body.id || ''

  $app.logger().info('Mercado Pago Webhook recebido', 'topic', topic, 'paymentId', paymentId)

  // Mercado Pago pode notificar como 'payment' ou 'payment.created' / 'payment.updated'
  if (topic.includes('payment') && paymentId) {
    const mpToken =
      $secrets.get('MERCADO_PAGO_ACCESS_TOKEN') || $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
    if (mpToken) {
      try {
        const payRes = $http.send({
          url: `https://api.mercadopago.com/v1/payments/${paymentId}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mpToken}`,
          },
          timeout: 15,
        })

        let payRaw = ''
        try {
          if (payRes.body) {
            payRaw = new TextDecoder().decode(payRes.body)
          }
        } catch (_) {
          payRaw = String(payRes.body || '')
        }

        const payJson = JSON.parse(payRaw || '{}')

        if (payRes.statusCode === 200 && payJson.status === 'approved') {
          // Extrair informações da referência externa
          let extRef = null
          try {
            extRef = JSON.parse(payJson.external_reference || '{}')
          } catch (_) {}

          const condoId = extRef?.condo_id
          const licencaId = extRef?.licenca_id

          let licenca = null
          if (licencaId) {
            try {
              licenca = $app.findRecordById('licencas', licencaId)
            } catch (_) {}
          }

          if (!licenca && condoId) {
            try {
              const list = $app.findRecordsByFilter(
                'licencas',
                `condo_id = '${condoId}'`,
                '-created',
                1,
              )
              if (list.length > 0) licenca = list[0]
            } catch (_) {}
          }

          if (licenca) {
            // Calcular nova data de expiração: hoje + 30 dias
            const now = new Date()
            const currentExpStr = licenca.getString('data_expiracao')
            let baseDate = now

            // Se a licença ainda não venceu, soma 30 dias a partir da data de expiração atual
            if (currentExpStr) {
              const currentExp = new Date(currentExpStr)
              if (currentExp.getTime() > now.getTime()) {
                baseDate = currentExp
              }
            }

            const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            const newExpISO = newExp.toISOString()

            licenca.set('status', 'ativa')
            licenca.set('data_expiracao', newExpISO)
            $app.saveNoValidate(licenca)

            $app
              .logger()
              .info(
                'Licença reativada por 30 dias com sucesso!',
                'licencaId',
                licenca.id,
                'novaExpiracao',
                newExpISO,
              )

            // Atualizar registro de pagamento
            try {
              const pagCol = $app.findCollectionByNameOrId('pagamentos_renovacao')
              const pag = new Record(pagCol)
              pag.set('condo_id', licenca.getString('condo_id'))
              pag.set('licenca_id', licenca.id)
              pag.set('plano_id', licenca.getString('plano_id'))
              pag.set('payment_id', String(paymentId))
              pag.set('status', 'approved')
              pag.set('valor', Number(payJson.transaction_amount || 0))
              pag.set('detalhes', { payment_data: payJson })
              $app.saveNoValidate(pag)
            } catch (_) {}
          }
        }
      } catch (err) {
        $app
          .logger()
          .error(
            'Erro ao consultar status do pagamento no Mercado Pago:',
            'error',
            err.message || err,
          )
      }
    }
  }

  return e.json(200, { received: true })
})
