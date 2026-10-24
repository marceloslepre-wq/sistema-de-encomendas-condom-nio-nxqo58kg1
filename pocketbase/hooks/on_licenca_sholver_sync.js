// Webhook de integração CondPack -> Sholver acionado na criação e atualização de licenças
// Garante o disparo automático do webhook para a Sholver (fire-and-forget)

onRecordAfterCreateSuccess((e) => {
  try {
    const licenca = e.record
    const condoId = licenca.getString('condo_id')
    const planoId = licenca.getString('plano_id')
    const statusLicenca = licenca.getString('status') || 'ativa'

    let condoRecord = null
    if (condoId) {
      try {
        condoRecord = $app.findRecordById('condos', condoId)
      } catch (_) {}
    }

    let planoRecord = null
    if (planoId) {
      try {
        planoRecord = $app.findRecordById('planos', planoId)
      } catch (_) {}
    }

    const razaoSocial = (condoRecord ? condoRecord.getString('name') : '') || 'Condomínio'
    const nomeFantasia =
      (condoRecord ? condoRecord.getString('responsavel') || condoRecord.getString('name') : '') ||
      razaoSocial
    const email = (condoRecord ? condoRecord.getString('email') : '') || 'contato@condominio.com.br'
    const telefone =
      (condoRecord
        ? condoRecord.getString('phone') || condoRecord.getString('whatsapp_phone')
        : '') || ''
    const documento = (condoRecord ? condoRecord.getString('cnpj') : '') || ''

    let endereco = ''
    if (condoRecord) {
      const addr = (condoRecord.getString('address') || '').trim()
      const cid = (condoRecord.getString('cidade') || '').trim()
      const est = (condoRecord.getString('estado') || '').trim()
      if (addr) {
        endereco = addr
        if (cid && !endereco.toLowerCase().includes(cid.toLowerCase())) {
          endereco += est ? `, ${cid}/${est}` : `, ${cid}`
        } else if (est && !endereco.toLowerCase().includes(est.toLowerCase())) {
          endereco += `/${est}`
        }
      } else if (cid || est) {
        endereco = [cid, est].filter(Boolean).join('/')
      }
    }

    const planoNome = (planoRecord ? planoRecord.getString('nome') : '') || 'Profissional'
    const preco = planoRecord ? Number(planoRecord.getInt('preco_mensal') || 0) : 0

    // Se for plano gratuito/master ou status trial/ativo
    let statusPedido = 'pago'
    let metodoPagamento = 'PIX'

    if (preco === 0) {
      statusPedido = 'pago'
      metodoPagamento = 'ISENTO'
    } else if (statusLicenca === 'ativa' && licenca.getString('data_expiracao')) {
      // Verificar se é trial (ex: 15 dias)
      statusPedido = 'trial_ativo'
      metodoPagamento = 'TRIAL'
    }

    const numeroPedido = `COND-2026-${licenca.id}`

    const payload = {
      numero_pedido: numeroPedido,
      cliente: {
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        email: email,
        telefone: telefone,
        documento: documento,
        endereco: endereco,
      },
      plano: {
        nome: planoNome,
      },
      produto: 'Condpack',
      valor: preco,
      metodo_pagamento: metodoPagamento,
      status: statusPedido,
    }

    const secret =
      $os.getenv('SHOLVER_WEBHOOK_SECRET') ||
      ($secrets.has && $secrets.has('SHOLVER_WEBHOOK_SECRET')
        ? $secrets.get('SHOLVER_WEBHOOK_SECRET')
        : '')

    if (!secret) {
      $app
        .logger()
        .error(
          'Sholver Webhook na criação de licença: segredo SHOLVER_WEBHOOK_SECRET não encontrado',
        )
      return e.next()
    }

    let httpStatus = 0
    let resBody = null
    let rawBody = ''
    let requestError = ''

    try {
      const res = $http.send({
        url: 'https://plataforma-skip-apps-98eed.shrd00.internal.goskip.dev/backend/v1/webhook/condpack',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sholver-Secret': secret,
          'X-API-Key': secret,
        },
        body: JSON.stringify(payload),
        timeout: 20,
      })

      if (res) {
        httpStatus = res.statusCode || 0
        if (res.raw) rawBody = String(res.raw)
        else if (res.body) {
          try {
            rawBody = new TextDecoder().decode(res.body)
          } catch (_) {
            rawBody = String(res.body)
          }
        }
        if (res.json && typeof res.json === 'object') resBody = res.json
        else if (rawBody && (rawBody.startsWith('{') || rawBody.startsWith('['))) {
          try {
            resBody = JSON.parse(rawBody)
          } catch (_) {}
        }
      }
    } catch (httpErr) {
      requestError = httpErr.message || String(httpErr)
    }

    const sucesso = httpStatus >= 200 && httpStatus < 300

    try {
      const col = $app.findCollectionByNameOrId('sholver_sync_logs')
      const rec = new Record(col)
      rec.set('numero_pedido', numeroPedido)
      if (condoId) rec.set('condo_id', condoId)
      rec.set('licenca_id', licenca.id)
      if (planoId) rec.set('plano_id', planoId)
      rec.set('evento', 'licenca_criada')
      rec.set('status_pedido', statusPedido)
      rec.set('metodo_pagamento', metodoPagamento)
      rec.set('valor', preco)
      rec.set('http_status', httpStatus)
      rec.set('sucesso', sucesso)
      rec.set('request_payload', payload)
      if (resBody) rec.set('response_body', resBody)
      else if (rawBody) rec.set('response_body', { raw: rawBody })
      if (requestError || !sucesso) {
        rec.set('error', requestError || `HTTP ${httpStatus}: ${rawBody.substring(0, 300)}`)
      }
      $app.saveNoValidate(rec)
    } catch (dbErr) {
      $app
        .logger()
        .error(
          'Erro ao salvar log Sholver após criação de licença:',
          'error',
          dbErr.message || dbErr,
        )
    }
  } catch (err) {
    $app.logger().error('Erro no hook Sholver licenca create:', 'error', err.message || err)
  }
  return e.next()
}, 'licencas')

onRecordAfterUpdateSuccess((e) => {
  try {
    const licenca = e.record
    const oldStatus = e.record.original().getString('status')
    const newStatus = licenca.getString('status')
    const oldPlanoId = e.record.original().getString('plano_id')
    const newPlanoId = licenca.getString('plano_id')

    // Disparar se status mudou (ex: expirada, cancelada, renovada) ou trocou de plano
    if (oldStatus === newStatus && oldPlanoId === newPlanoId) {
      return e.next()
    }

    const condoId = licenca.getString('condo_id')
    const planoId = newPlanoId

    let condoRecord = null
    if (condoId) {
      try {
        condoRecord = $app.findRecordById('condos', condoId)
      } catch (_) {}
    }

    let planoRecord = null
    if (planoId) {
      try {
        planoRecord = $app.findRecordById('planos', planoId)
      } catch (_) {}
    }

    const razaoSocial = (condoRecord ? condoRecord.getString('name') : '') || 'Condomínio'
    const nomeFantasia =
      (condoRecord ? condoRecord.getString('responsavel') || condoRecord.getString('name') : '') ||
      razaoSocial
    const email = (condoRecord ? condoRecord.getString('email') : '') || 'contato@condominio.com.br'
    const telefone =
      (condoRecord
        ? condoRecord.getString('phone') || condoRecord.getString('whatsapp_phone')
        : '') || ''
    const documento = (condoRecord ? condoRecord.getString('cnpj') : '') || ''

    let endereco = ''
    if (condoRecord) {
      const addr = (condoRecord.getString('address') || '').trim()
      const cid = (condoRecord.getString('cidade') || '').trim()
      const est = (condoRecord.getString('estado') || '').trim()
      if (addr) {
        endereco = addr
        if (cid && !endereco.toLowerCase().includes(cid.toLowerCase())) {
          endereco += est ? `, ${cid}/${est}` : `, ${cid}`
        } else if (est && !endereco.toLowerCase().includes(est.toLowerCase())) {
          endereco += `/${est}`
        }
      } else if (cid || est) {
        endereco = [cid, est].filter(Boolean).join('/')
      }
    }

    const planoNome = (planoRecord ? planoRecord.getString('nome') : '') || 'Profissional'
    const preco = planoRecord ? Number(planoRecord.getInt('preco_mensal') || 0) : 0

    let statusPedido = 'pendente'
    if (newStatus === 'ativa') statusPedido = 'pago'
    else if (newStatus === 'expirada') statusPedido = 'expirado'
    else if (newStatus === 'cancelada') statusPedido = 'cancelado'
    else if (newStatus === 'renovada' || newStatus === 'Renovada') statusPedido = 'renovado'
    else statusPedido = newStatus

    const numeroPedido = `COND-2026-${licenca.id}`

    const payload = {
      numero_pedido: numeroPedido,
      cliente: {
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        email: email,
        telefone: telefone,
        documento: documento,
        endereco: endereco,
      },
      plano: {
        nome: planoNome,
      },
      produto: 'Condpack',
      valor: preco,
      metodo_pagamento: 'PIX',
      status: statusPedido,
    }

    const secret =
      $os.getenv('SHOLVER_WEBHOOK_SECRET') ||
      ($secrets.has && $secrets.has('SHOLVER_WEBHOOK_SECRET')
        ? $secrets.get('SHOLVER_WEBHOOK_SECRET')
        : '')

    if (!secret) return e.next()

    let httpStatus = 0
    let resBody = null
    let rawBody = ''
    let requestError = ''

    try {
      const res = $http.send({
        url: 'https://plataforma-skip-apps-98eed.shrd00.internal.goskip.dev/backend/v1/webhook/condpack',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sholver-Secret': secret,
          'X-API-Key': secret,
        },
        body: JSON.stringify(payload),
        timeout: 20,
      })

      if (res) {
        httpStatus = res.statusCode || 0
        if (res.raw) rawBody = String(res.raw)
        else if (res.body) {
          try {
            rawBody = new TextDecoder().decode(res.body)
          } catch (_) {
            rawBody = String(res.body)
          }
        }
        if (res.json && typeof res.json === 'object') resBody = res.json
        else if (rawBody && (rawBody.startsWith('{') || rawBody.startsWith('['))) {
          try {
            resBody = JSON.parse(rawBody)
          } catch (_) {}
        }
      }
    } catch (httpErr) {
      requestError = httpErr.message || String(httpErr)
    }

    const sucesso = httpStatus >= 200 && httpStatus < 300

    try {
      const col = $app.findCollectionByNameOrId('sholver_sync_logs')
      const rec = new Record(col)
      rec.set('numero_pedido', numeroPedido)
      if (condoId) rec.set('condo_id', condoId)
      rec.set('licenca_id', licenca.id)
      if (planoId) rec.set('plano_id', planoId)
      rec.set('evento', `licenca_status_${newStatus}`)
      rec.set('status_pedido', statusPedido)
      rec.set('metodo_pagamento', 'PIX')
      rec.set('valor', preco)
      rec.set('http_status', httpStatus)
      rec.set('sucesso', sucesso)
      rec.set('request_payload', payload)
      if (resBody) rec.set('response_body', resBody)
      else if (rawBody) rec.set('response_body', { raw: rawBody })
      if (requestError || !sucesso) {
        rec.set('error', requestError || `HTTP ${httpStatus}: ${rawBody.substring(0, 300)}`)
      }
      $app.saveNoValidate(rec)
    } catch (dbErr) {
      $app
        .logger()
        .error(
          'Erro ao salvar log Sholver após update de licença:',
          'error',
          dbErr.message || dbErr,
        )
    }
  } catch (err) {
    $app.logger().error('Erro no hook Sholver licenca update:', 'error', err.message || err)
  }
  return e.next()
}, 'licencas')
