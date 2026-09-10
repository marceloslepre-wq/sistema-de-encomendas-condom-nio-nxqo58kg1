// Integração de Pagamento de Renovação exclusivamente via PIX (Mercado Pago)
// Endpoints:
// - POST /backend/v1/pagamento/pix/criar (Gera cobrança PIX no Mercado Pago com QR Code e Copia e Cola)
// - GET  /backend/v1/pagamento/pix/status/{payment_id} (Consulta status da cobrança PIX)
// - POST /backend/v1/pagamento/webhook (Recebe notificações do Mercado Pago e renova a licença)
// - POST /backend/v1/pagamento/renovar (Legado/compatibilidade redirecionando para Checkout Pro se chamado)

// 1. Endpoint para criar pagamento exclusivamente PIX
routerAdd(
  'POST',
  '/backend/v1/pagamento/pix/criar',
  (e) => {
    let auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        const rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        const token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

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

      // Bloquear cobrança apenas para o Plano Master verdadeiro (gratuito e vitalício)
      const planoNomeCheck = (plano.getString('nome') || '').trim()
      const isPlanoMasterIsento =
        planoNomeCheck === 'Plano no Master' ||
        planoNomeCheck === 'Plano Master' ||
        (plano.getBool('exclusivo_master') &&
          plano.getInt('max_moradores') <= 0 &&
          plano.getInt('max_units') <= 0 &&
          Number(plano.getInt('preco_mensal') || 0) === 0)

      if (isPlanoMasterIsento) {
        return e.badRequestError('Licenças no Plano Master são isentas e não requerem pagamento.')
      }

      const precoMensal = Number(plano.getInt('preco_mensal') || 199.9)
      if (precoMensal <= 0) {
        return e.badRequestError('O valor do plano deve ser maior que zero para gerar cobrança.')
      }

      const planoNome = plano.getString('nome') || 'Plano Mensal'
      const condoName = condo.getString('name') || 'Condomínio'

      // Obter URL pública para o Webhook
      const siteUrl =
        $os.getenv('SITE_URL') ||
        $secrets.get('SITE_URL') ||
        'https://sistema-de-encomendas-condominio-03d6a.shrd00.internal.goskip.dev'
      const notificationUrl = `${siteUrl}/backend/v1/pagamento/webhook`

      // Payer info
      let payerEmail = (auth.getString('email') || '').trim()
      if (!payerEmail || !payerEmail.includes('@')) {
        payerEmail = (condo.getString('email') || '').trim()
      }
      if (!payerEmail || !payerEmail.includes('@')) {
        payerEmail = 'gestor@condominio.com.br'
      }

      let payerRawName = (auth.getString('name') || condoName || 'Gestor').trim()
      let nameParts = payerRawName.split(/\s+/).filter(Boolean)
      let firstName = nameParts[0] || 'Gestor'
      let lastName = nameParts.slice(1).join(' ') || 'Condomínio'

      const payerObj = {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
      }

      // Se o usuário ou o condomínio tiverem CPF/CNPJ, incluir identification
      const userCpf = (auth.getString('cpf') || '').replace(/\D/g, '')
      const condoCnpj = (condo.getString('cnpj') || '').replace(/\D/g, '')
      if (userCpf && (userCpf.length === 11 || userCpf.length === 14)) {
        payerObj.identification = {
          type: userCpf.length === 11 ? 'CPF' : 'CNPJ',
          number: userCpf,
        }
      } else if (condoCnpj && (condoCnpj.length === 11 || condoCnpj.length === 14)) {
        payerObj.identification = {
          type: condoCnpj.length === 14 ? 'CNPJ' : 'CPF',
          number: condoCnpj,
        }
      }

      // Montar payload estritamente para PIX: POST /v1/payments
      const paymentPayload = {
        transaction_amount: precoMensal,
        description: `Renovação 30 dias - ${planoNome} (${condoName})`,
        payment_method_id: 'pix',
        notification_url: notificationUrl,
        payer: payerObj,
        external_reference: JSON.stringify({
          condo_id: userCondoId,
          licenca_id: licenca.id,
          plano_id: plano.id,
        }),
      }

      // Gerar idempotency key para evitar requisição duplicada instantânea
      const idempotencyKey = `pix_${licenca.id}_${Date.now()}`

      let response = null
      try {
        response = $http.send({
          url: 'https://api.mercadopago.com/v1/payments',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mpToken}`,
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(paymentPayload),
          timeout: 25,
        })
      } catch (httpErr) {
        $app
          .logger()
          .error(
            'Falha de rede ao conectar à API do Mercado Pago:',
            'error',
            httpErr.message || String(httpErr),
          )
        return e.badRequestError(
          'Falha de conexão com o Mercado Pago: ' + (httpErr.message || String(httpErr)),
        )
      }

      let rawBody = ''
      if (response && response.raw) {
        rawBody = String(response.raw || '').trim()
      } else if (response && response.body !== undefined && response.body !== null) {
        try {
          rawBody = new TextDecoder().decode(response.body).trim()
        } catch (_) {
          if (Array.isArray(response.body)) {
            rawBody = String.fromCharCode.apply(null, response.body).trim()
          } else {
            rawBody = String(response.body || '').trim()
          }
        }
      }

      let resJson = {}
      if (response && response.json && typeof response.json === 'object') {
        resJson = response.json
      } else if (rawBody && (rawBody.startsWith('{') || rawBody.startsWith('['))) {
        try {
          resJson = JSON.parse(rawBody)
        } catch (parseErr) {
          $app
            .logger()
            .error(
              'Falha ao parsear JSON do Mercado Pago:',
              'body',
              rawBody,
              'error',
              parseErr.message || String(parseErr),
            )
          resJson = {}
        }
      }

      if (response && response.statusCode >= 200 && response.statusCode < 300 && resJson.id) {
        const paymentId = String(resJson.id)
        const txData =
          resJson.point_of_interaction && resJson.point_of_interaction.transaction_data
            ? resJson.point_of_interaction.transaction_data
            : null

        const qrCode = txData ? txData.qr_code : ''
        const qrCodeBase64 = txData ? txData.qr_code_base64 : ''
        const ticketUrl = txData ? txData.ticket_url : ''

        // Registrar intenção de pagamento na coleção pagamentos_renovacao
        try {
          const pagCol = $app.findCollectionByNameOrId('pagamentos_renovacao')
          const pagRecord = new Record(pagCol)
          pagRecord.set('condo_id', userCondoId)
          pagRecord.set('licenca_id', licenca.id)
          pagRecord.set('plano_id', plano.id)
          pagRecord.set('payment_id', paymentId)
          pagRecord.set('status', resJson.status || 'pending')
          pagRecord.set('valor', precoMensal)
          pagRecord.set('tipo_pagamento', 'pix')
          pagRecord.set('qr_code', qrCode)
          pagRecord.set('qr_code_base64', qrCodeBase64)
          pagRecord.set('detalhes', {
            date_of_expiration: resJson.date_of_expiration,
            ticket_url: ticketUrl,
            payment_method_id: 'pix',
          })
          $app.saveNoValidate(pagRecord)
        } catch (logErr) {
          $app
            .logger()
            .error('Erro ao registrar log de pagamento PIX:', 'error', logErr.message || logErr)
        }

        return e.json(200, {
          configured: true,
          payment_id: paymentId,
          status: resJson.status || 'pending',
          status_detail: resJson.status_detail || 'accredited',
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          ticket_url: ticketUrl,
          date_of_expiration: resJson.date_of_expiration,
          valor: precoMensal,
          plano_nome: planoNome,
          condo_name: condoName,
          licenca_id: licenca.id,
        })
      } else {
        const mpStatusCode = response ? response.statusCode : 0
        $app
          .logger()
          .error(
            'Erro retornado pela API do Mercado Pago (PIX):',
            'statusCode',
            mpStatusCode,
            'body',
            rawBody,
          )

        let friendlyError = 'Falha ao gerar cobrança PIX.'
        if (mpStatusCode === 401 || mpStatusCode === 403) {
          friendlyError =
            'Credencial do Mercado Pago inválida ou não autorizada. Verifique o Access Token com o administrador.'
        } else if (resJson.message) {
          friendlyError = resJson.message
          if (Array.isArray(resJson.cause) && resJson.cause.length > 0) {
            const causes = resJson.cause
              .map((c) => c.description || c.code || '')
              .filter(Boolean)
              .join('; ')
            if (causes) {
              friendlyError += ` (${causes})`
            }
          }
        } else if (resJson.error) {
          friendlyError = String(resJson.error)
        } else if (rawBody) {
          friendlyError = rawBody.substring(0, 150)
        }

        return e.badRequestError('Erro ao comunicar com Mercado Pago: ' + friendlyError)
      }
    } catch (err) {
      return e.badRequestError('Erro ao processar cobrança PIX: ' + (err.message || err))
    }
  },
  $apis.requireAuth(),
)

// 2. Endpoint para o frontend consultar status do pagamento PIX (polling direto)
routerAdd(
  'GET',
  '/backend/v1/pagamento/pix/status/{payment_id}',
  (e) => {
    let auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        const rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        const token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const role = auth.getString('role')
    const userCondoId = auth.getString('condo_id')
    const paymentId = e.request.pathValue('payment_id')

    if (!paymentId) {
      return e.badRequestError('ID do pagamento não informado.')
    }

    // 1º passo: verificar na base de pagamentos_renovacao local
    let localPag = null
    try {
      const list = $app.findRecordsByFilter(
        'pagamentos_renovacao',
        `payment_id = '${paymentId}'`,
        '-created',
        1,
      )
      if (list.length > 0) localPag = list[0]
    } catch (_) {}

    if (localPag && role !== 'master' && localPag.getString('condo_id') !== userCondoId) {
      return e.forbiddenError('Sem permissão para consultar este pagamento.')
    }

    // Se já está aprovado localmente, retorna imediatamente com os dados da licença atualizada
    if (
      localPag &&
      (localPag.getString('status') === 'approved' || localPag.getString('status') === 'Aprovado')
    ) {
      let licencaAtual = null
      const licId = localPag.getString('licenca_id')
      if (licId) {
        try {
          licencaAtual = $app.findRecordById('licencas', licId)
        } catch (_) {}
      }
      if (!licencaAtual && userCondoId) {
        try {
          const lList = $app.findRecordsByFilter(
            'licencas',
            `condo_id = '${userCondoId}'`,
            '-created',
            1,
          )
          if (lList.length > 0) licencaAtual = lList[0]
        } catch (_) {}
      }

      return e.json(200, {
        payment_id: paymentId,
        status: 'approved',
        status_detail: 'accredited',
        licenca_id: licencaAtual ? licencaAtual.id : licId,
        data_expiracao: licencaAtual ? licencaAtual.getString('data_expiracao') : null,
        renovado: true,
      })
    }

    // Se ainda está pendente ou não aprovado na base, consulta API do Mercado Pago
    const mpToken =
      $secrets.get('MERCADO_PAGO_ACCESS_TOKEN') || $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
    if (!mpToken) {
      return e.json(200, {
        payment_id: paymentId,
        status: localPag ? localPag.getString('status') : 'pending',
        renovado: false,
      })
    }

    try {
      let payRes = null
      try {
        payRes = $http.send({
          url: `https://api.mercadopago.com/v1/payments/${paymentId}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mpToken}`,
          },
          timeout: 15,
        })
      } catch (httpErr) {
        $app
          .logger()
          .error(
            'Falha de rede ao consultar status PIX:',
            'error',
            httpErr.message || String(httpErr),
          )
        return e.json(200, {
          payment_id: paymentId,
          status: localPag ? localPag.getString('status') : 'pending',
          renovado: false,
        })
      }

      let payRaw = ''
      if (payRes && payRes.raw) {
        payRaw = String(payRes.raw || '').trim()
      } else if (payRes && payRes.body !== undefined && payRes.body !== null) {
        try {
          payRaw = new TextDecoder().decode(payRes.body).trim()
        } catch (_) {
          if (Array.isArray(payRes.body)) {
            payRaw = String.fromCharCode.apply(null, payRes.body).trim()
          } else {
            payRaw = String(payRes.body || '').trim()
          }
        }
      }

      let payJson = {}
      if (payRes && payRes.json && typeof payRes.json === 'object') {
        payJson = payRes.json
      } else if (payRaw && (payRaw.startsWith('{') || payRaw.startsWith('['))) {
        try {
          payJson = JSON.parse(payRaw)
        } catch (_) {
          payJson = {}
        }
      }

      if (payRes && payRes.statusCode === 200 && payJson.id) {
        const mpStatus = payJson.status // 'approved', 'pending', 'in_process', 'rejected', 'cancelled'

        if (mpStatus === 'approved') {
          // Processar aprovação inline
          let extRef = null
          try {
            extRef = JSON.parse(payJson.external_reference || '{}')
          } catch (_) {}

          const condoId = extRef?.condo_id
          const licencaAntigaId = extRef?.licenca_id
          const planoIdRef = extRef?.plano_id

          let novaLicId = ''
          let novaExpISO = ''

          // Checar se já processou
          if (!localPag || localPag.getString('status') !== 'approved') {
            let licAntiga = null
            if (licencaAntigaId) {
              try {
                licAntiga = $app.findRecordById('licencas', licencaAntigaId)
              } catch (_) {}
            }
            if (!licAntiga && condoId) {
              try {
                const lList = $app.findRecordsByFilter(
                  'licencas',
                  `condo_id = '${condoId}'`,
                  '-created',
                  1,
                )
                if (lList.length > 0) licAntiga = lList[0]
              } catch (_) {}
            }

            const effCondoId =
              condoId || (licAntiga ? licAntiga.getString('condo_id') : userCondoId)
            const effPlanoId = planoIdRef || (licAntiga ? licAntiga.getString('plano_id') : null)

            const now = new Date()
            let baseDate = now
            if (licAntiga) {
              const currentExpStr = licAntiga.getString('data_expiracao')
              if (currentExpStr) {
                const curExp = new Date(currentExpStr)
                if (curExp.getTime() > now.getTime()) {
                  baseDate = curExp
                }
              }
            }
            const novaExpDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            novaExpISO = novaExpDate.toISOString()

            let planoNome = 'Plano Mensal'
            if (effPlanoId) {
              try {
                const p = $app.findRecordById('planos', effPlanoId)
                planoNome = p.getString('nome') || planoNome
              } catch (_) {}
            }

            try {
              const licencasCol = $app.findCollectionByNameOrId('licencas')
              const novaLic = new Record(licencasCol)
              novaLic.set('condo_id', effCondoId)
              novaLic.set('plano_id', effPlanoId)
              novaLic.set('status', 'ativa')
              novaLic.set('data_expiracao', novaExpISO)
              $app.saveNoValidate(novaLic)
              novaLicId = novaLic.id

              // Marcar licença(s) anterior(es) do mesmo condomínio como 'renovada'
              try {
                const anteriores = $app.findRecordsByFilter(
                  'licencas',
                  `condo_id = '${effCondoId}' && id != '${novaLicId}' && (status = 'ativa' || status = 'ativo')`,
                  '-created',
                  50,
                )
                for (let k = 0; k < anteriores.length; k++) {
                  anteriores[k].set('status', 'renovada')
                  $app.saveNoValidate(anteriores[k])
                }
              } catch (_) {}
            } catch (errLic) {
              if (licAntiga) {
                licAntiga.set('status', 'ativa')
                licAntiga.set('data_expiracao', novaExpISO)
                $app.saveNoValidate(licAntiga)
                novaLicId = licAntiga.id
              }
            }

            try {
              const pagCol = $app.findCollectionByNameOrId('pagamentos_renovacao')
              let pagRec = localPag
              if (!pagRec) {
                pagRec = new Record(pagCol)
                pagRec.set('payment_id', String(paymentId))
              }
              pagRec.set('condo_id', effCondoId)
              pagRec.set('licenca_id', novaLicId || licencaAntigaId)
              pagRec.set('plano_id', effPlanoId)
              pagRec.set('status', 'approved')
              pagRec.set('tipo_pagamento', 'pix')
              pagRec.set('valor', Number(payJson.transaction_amount || 0))
              pagRec.set('detalhes', { payment_data: payJson })
              $app.saveNoValidate(pagRec)
            } catch (_) {}

            try {
              const histCol = $app.findCollectionByNameOrId('historico_licencas')
              const hist = new Record(histCol)
              hist.set('condo_id', effCondoId)
              hist.set('licenca_id', novaLicId || licencaAntigaId)
              hist.set('plano_id', effPlanoId)
              hist.set('tipo_evento', 'renovacao')
              hist.set('plano_nome', planoNome)
              hist.set('data_expiracao', novaExpISO)
              hist.set(
                'descricao',
                `Renovação de 30 dias via PIX confirmada (Mercado Pago ID #${paymentId}). Nova licença: ${novaLicId || licencaAntigaId}`,
              )
              hist.set('alterado_por', 'Mercado Pago PIX')
              $app.saveNoValidate(hist)
            } catch (_) {}
          } else {
            novaLicId = localPag.getString('licenca_id')
          }

          return e.json(200, {
            payment_id: paymentId,
            status: 'approved',
            status_detail: payJson.status_detail || 'accredited',
            licenca_id: novaLicId,
            data_expiracao: novaExpISO,
            renovado: true,
          })
        }

        return e.json(200, {
          payment_id: paymentId,
          status: mpStatus,
          status_detail: payJson.status_detail || '',
          renovado: false,
        })
      } else {
        return e.json(200, {
          payment_id: paymentId,
          status: localPag ? localPag.getString('status') : 'pending',
          renovado: false,
        })
      }
    } catch (err) {
      return e.json(200, {
        payment_id: paymentId,
        status: localPag ? localPag.getString('status') : 'pending',
        renovado: false,
        error: err.message || err,
      })
    }
  },
  $apis.requireAuth(),
)

// 3. Webhook Mercado Pago para confirmação automática de pagamentos (PIX e Checkout Pro)
routerAdd('POST', '/backend/v1/pagamento/webhook', (e) => {
  const query = e.requestInfo().query || {}
  const body = e.requestInfo().body || {}

  const topic = query.topic || body.type || query.type || body.action || ''
  const paymentId = (body.data && body.data.id) || query.id || body.id || ''

  $app
    .logger()
    .info('Mercado Pago Webhook recebido', 'topic', topic, 'paymentId', String(paymentId))

  if (
    (topic.includes('payment') ||
      topic.includes('payment.created') ||
      topic.includes('payment.updated')) &&
    paymentId
  ) {
    const mpToken =
      $secrets.get('MERCADO_PAGO_ACCESS_TOKEN') || $os.getenv('MERCADO_PAGO_ACCESS_TOKEN') || ''
    if (mpToken) {
      try {
        let payRes = null
        try {
          payRes = $http.send({
            url: `https://api.mercadopago.com/v1/payments/${paymentId}`,
            method: 'GET',
            headers: {
              Authorization: `Bearer ${mpToken}`,
            },
            timeout: 15,
          })
        } catch (httpErr) {
          $app
            .logger()
            .error(
              'Falha de rede ao consultar pagamento no Webhook:',
              'error',
              httpErr.message || String(httpErr),
            )
          return e.json(200, { received: true })
        }

        let payRaw = ''
        if (payRes && payRes.raw) {
          payRaw = String(payRes.raw || '').trim()
        } else if (payRes && payRes.body !== undefined && payRes.body !== null) {
          try {
            payRaw = new TextDecoder().decode(payRes.body).trim()
          } catch (_) {
            if (Array.isArray(payRes.body)) {
              payRaw = String.fromCharCode.apply(null, payRes.body).trim()
            } else {
              payRaw = String(payRes.body || '').trim()
            }
          }
        }

        let payJson = {}
        if (payRes && payRes.json && typeof payRes.json === 'object') {
          payJson = payRes.json
        } else if (payRaw && (payRaw.startsWith('{') || payRaw.startsWith('['))) {
          try {
            payJson = JSON.parse(payRaw)
          } catch (_) {
            payJson = {}
          }
        }

        if (payRes && payRes.statusCode === 200 && payJson.status === 'approved') {
          // Processar aprovação inline
          let extRef = null
          try {
            extRef = JSON.parse(payJson.external_reference || '{}')
          } catch (_) {}

          const condoId = extRef?.condo_id
          const licencaAntigaId = extRef?.licenca_id
          const planoIdRef = extRef?.plano_id

          let pagRecord = null
          try {
            const pList = $app.findRecordsByFilter(
              'pagamentos_renovacao',
              `payment_id = '${paymentId}'`,
              '-created',
              1,
            )
            if (pList.length > 0) pagRecord = pList[0]
          } catch (_) {}

          // Se já foi aprovado e processado, evita duplicação
          if (!pagRecord || pagRecord.getString('status') !== 'approved') {
            let licencaAntiga = null
            if (licencaAntigaId) {
              try {
                licencaAntiga = $app.findRecordById('licencas', licencaAntigaId)
              } catch (_) {}
            }
            if (!licencaAntiga && condoId) {
              try {
                const lList = $app.findRecordsByFilter(
                  'licencas',
                  `condo_id = '${condoId}'`,
                  '-created',
                  1,
                )
                if (lList.length > 0) licencaAntiga = lList[0]
              } catch (_) {}
            }

            const effectiveCondoId =
              condoId || (licencaAntiga ? licencaAntiga.getString('condo_id') : null)
            const effectivePlanoId =
              planoIdRef || (licencaAntiga ? licencaAntiga.getString('plano_id') : null)

            const now = new Date()
            let baseDate = now
            if (licencaAntiga) {
              const currentExpStr = licencaAntiga.getString('data_expiracao')
              if (currentExpStr) {
                const curExp = new Date(currentExpStr)
                if (curExp.getTime() > now.getTime()) {
                  baseDate = curExp
                }
              }
            }
            const novaExpDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            const novaExpISO = novaExpDate.toISOString()

            let planoNome = 'Plano Mensal'
            if (effectivePlanoId) {
              try {
                const p = $app.findRecordById('planos', effectivePlanoId)
                planoNome = p.getString('nome') || planoNome
              } catch (_) {}
            }

            let novaLicencaId = ''
            try {
              const licencasCol = $app.findCollectionByNameOrId('licencas')
              const novaLicenca = new Record(licencasCol)
              novaLicenca.set('condo_id', effectiveCondoId)
              novaLicenca.set('plano_id', effectivePlanoId)
              novaLicenca.set('status', 'ativa')
              novaLicenca.set('data_expiracao', novaExpISO)
              $app.saveNoValidate(novaLicenca)
              novaLicencaId = novaLicenca.id

              // Marcar licença(s) anterior(es) do mesmo condomínio como 'renovada'
              try {
                const anteriores = $app.findRecordsByFilter(
                  'licencas',
                  `condo_id = '${effectiveCondoId}' && id != '${novaLicencaId}' && (status = 'ativa' || status = 'ativo')`,
                  '-created',
                  50,
                )
                for (let k = 0; k < anteriores.length; k++) {
                  anteriores[k].set('status', 'renovada')
                  $app.saveNoValidate(anteriores[k])
                }
              } catch (_) {}
            } catch (errLic) {
              if (licencaAntiga) {
                licencaAntiga.set('status', 'ativa')
                licencaAntiga.set('data_expiracao', novaExpISO)
                $app.saveNoValidate(licencaAntiga)
                novaLicencaId = licencaAntiga.id
              }
            }

            try {
              const pagCol = $app.findCollectionByNameOrId('pagamentos_renovacao')
              if (!pagRecord) {
                pagRecord = new Record(pagCol)
                pagRecord.set('payment_id', String(paymentId))
              }
              pagRecord.set('condo_id', effectiveCondoId)
              pagRecord.set('licenca_id', novaLicencaId || licencaAntigaId)
              pagRecord.set('plano_id', effectivePlanoId)
              pagRecord.set('status', 'approved')
              pagRecord.set('tipo_pagamento', 'pix')
              pagRecord.set('valor', Number(payJson.transaction_amount || 0))
              pagRecord.set('detalhes', { payment_data: payJson })
              $app.saveNoValidate(pagRecord)
            } catch (_) {}

            try {
              const histCol = $app.findCollectionByNameOrId('historico_licencas')
              const hist = new Record(histCol)
              hist.set('condo_id', effectiveCondoId)
              hist.set('licenca_id', novaLicencaId || licencaAntigaId)
              hist.set('plano_id', effectivePlanoId)
              hist.set('tipo_evento', 'renovacao')
              hist.set('plano_nome', planoNome)
              hist.set('data_expiracao', novaExpISO)
              hist.set(
                'descricao',
                `Renovação de 30 dias via PIX confirmada (Webhook Mercado Pago ID #${paymentId}). Nova licença: ${novaLicencaId || licencaAntigaId}`,
              )
              hist.set('alterado_por', 'Webhook Mercado Pago PIX')
              $app.saveNoValidate(hist)
            } catch (_) {}

            $app
              .logger()
              .info(
                'Webhook processou aprovação do pagamento!',
                'paymentId',
                String(paymentId),
                'novaLicencaId',
                novaLicencaId,
              )
          }
        } else {
          // Atualiza status pendente/cancelado se já tiver registro
          try {
            const list = $app.findRecordsByFilter(
              'pagamentos_renovacao',
              `payment_id = '${paymentId}'`,
              '-created',
              1,
            )
            if (list.length > 0 && list[0].getString('status') !== 'approved') {
              list[0].set('status', payJson.status || 'pending')
              $app.saveNoValidate(list[0])
            }
          } catch (_) {}
        }
      } catch (err) {
        $app
          .logger()
          .error(
            'Erro ao consultar status do pagamento no Mercado Pago pelo Webhook:',
            'error',
            err.message || err,
          )
      }
    }
  }

  return e.json(200, { received: true })
})

// 4. Rota legada de Checkout Pro (mantida para compatibilidade)
routerAdd(
  'POST',
  '/backend/v1/pagamento/renovar',
  (e) => {
    let auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        const rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        const token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

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

      const planoNomeCheckLegado = (plano.getString('nome') || '').trim()
      const isPlanoMasterIsentoLegado =
        planoNomeCheckLegado === 'Plano no Master' ||
        planoNomeCheckLegado === 'Plano Master' ||
        (plano.getBool('exclusivo_master') &&
          plano.getInt('max_moradores') <= 0 &&
          plano.getInt('max_units') <= 0 &&
          Number(plano.getInt('preco_mensal') || 0) === 0)

      if (isPlanoMasterIsentoLegado) {
        return e.badRequestError('Licenças no Plano Master são isentas e não requerem pagamento.')
      }

      const precoMensal = Number(plano.getInt('preco_mensal') || 199.9)
      const planoNome = plano.getString('nome') || 'Plano Mensal'
      const condoName = condo.getString('name') || 'Condomínio'

      const siteUrl =
        $os.getenv('SITE_URL') ||
        $secrets.get('SITE_URL') ||
        'https://sistema-de-encomendas-condominio-03d6a.shrd00.internal.goskip.dev'
      const backSuccess = `${siteUrl}/renovar?status=aprovado`
      const backPending = `${siteUrl}/renovar?status=pendente`
      const backFailure = `${siteUrl}/renovar?status=falha`
      const webhookUrl = `${siteUrl}/backend/v1/pagamento/webhook`

      const preferencePayload = {
        items: [
          {
            id: `renovacao_${licenca.id}`,
            title: `Renovação de Assinatura 30 dias - ${planoNome} (${condoName})`,
            description: `Renovação por 30 dias do sistema de encomendas CondoPack para ${condoName}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: precoMensal,
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

      let response = null
      try {
        response = $http.send({
          url: 'https://api.mercadopago.com/checkout/preferences',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mpToken}`,
          },
          body: JSON.stringify(preferencePayload),
          timeout: 20,
        })
      } catch (httpErr) {
        $app
          .logger()
          .error('Falha de rede ao criar preference:', 'error', httpErr.message || String(httpErr))
        return e.badRequestError(
          'Falha de conexão com o Mercado Pago: ' + (httpErr.message || String(httpErr)),
        )
      }

      let rawBody = ''
      if (response && response.raw) {
        rawBody = String(response.raw || '').trim()
      } else if (response && response.body !== undefined && response.body !== null) {
        try {
          rawBody = new TextDecoder().decode(response.body).trim()
        } catch (_) {
          if (Array.isArray(response.body)) {
            rawBody = String.fromCharCode.apply(null, response.body).trim()
          } else {
            rawBody = String(response.body || '').trim()
          }
        }
      }

      let resJson = {}
      if (response && response.json && typeof response.json === 'object') {
        resJson = response.json
      } else if (rawBody && (rawBody.startsWith('{') || rawBody.startsWith('['))) {
        try {
          resJson = JSON.parse(rawBody)
        } catch (_) {
          resJson = {}
        }
      }

      if (response && response.statusCode >= 200 && response.statusCode < 300 && resJson.id) {
        try {
          const pagCol = $app.findCollectionByNameOrId('pagamentos_renovacao')
          const pagRecord = new Record(pagCol)
          pagRecord.set('condo_id', userCondoId)
          pagRecord.set('licenca_id', licenca.id)
          pagRecord.set('plano_id', plano.id)
          pagRecord.set('preference_id', resJson.id)
          pagRecord.set('status', 'pending')
          pagRecord.set('valor', precoMensal)
          pagRecord.set('detalhes', { init_point: resJson.init_point })
          $app.saveNoValidate(pagRecord)
        } catch (_) {}

        return e.json(200, {
          configured: true,
          preference_id: resJson.id,
          init_point: resJson.init_point,
          sandbox_init_point: resJson.sandbox_init_point,
          valor: precoMensal,
          plano_nome: planoNome,
        })
      } else {
        return e.badRequestError(
          'Erro ao comunicar com Mercado Pago: ' + (resJson.message || 'Falha ao gerar cobrança.'),
        )
      }
    } catch (err) {
      return e.badRequestError('Erro ao processar renovação: ' + (err.message || err))
    }
  },
  $apis.requireAuth(),
)
