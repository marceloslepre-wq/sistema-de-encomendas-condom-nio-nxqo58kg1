// Hook de teste do webhook CondPack -> Sholver
// Permite disparar o webhook de teste com os headers e payload oficiais e retornar o resultado HTTP (ex: 200)

routerAdd('POST', '/backend/v1/sholver/webhook/test', (e) => {
  const SHOLVER_ENDPOINT =
    'https://plataforma-skip-apps-98eed.shrd00.internal.goskip.dev/backend/v1/webhook/condpack'

  const secret =
    $os.getenv('SHOLVER_WEBHOOK_SECRET') ||
    ($secrets.has && $secrets.has('SHOLVER_WEBHOOK_SECRET')
      ? $secrets.get('SHOLVER_WEBHOOK_SECRET')
      : '')

  const body = (e.requestInfo && e.requestInfo().body) || {}
  const clienteBody = body.cliente || {}
  const planoBody = body.plano || {}

  let rawNumero = body.numero_pedido || body.pedido_id || body.licenca_id || body.id || ''
  if (!rawNumero) {
    rawNumero = '000123'
  }
  const cleanNumero = String(rawNumero)
    .trim()
    .replace(/^COND-2026-/i, '')
  const numeroPedido = `COND-2026-${cleanNumero}`

  const enderecoCliente =
    clienteBody.endereco !== undefined
      ? clienteBody.endereco
      : body.endereco !== undefined
        ? body.endereco
        : 'Av. Exemplo, 123 - Vitória/ES, CEP 29000-000'

  const payload = {
    numero_pedido: numeroPedido,
    cliente: {
      razao_social: (
        clienteBody.razao_social ||
        body.razao_social ||
        'Condomínio Exemplo LTDA'
      ).trim(),
      nome_fantasia: (
        clienteBody.nome_fantasia ||
        body.nome_fantasia ||
        'Condomínio Exemplo'
      ).trim(),
      email: (clienteBody.email || body.email || 'contato@condominio.com.br').trim(),
      telefone: (clienteBody.telefone || body.telefone || '27999999999').trim(),
      documento: (clienteBody.documento || body.documento || '00.000.000/0000-00').trim(),
      endereco: String(enderecoCliente || '').trim(),
    },
    plano: {
      nome: (planoBody.nome || body.plano_nome || 'Profissional').trim(),
    },
    produto: 'Condpack',
    valor: body.valor !== undefined ? Number(body.valor) : 199.9,
    metodo_pagamento: (body.metodo_pagamento || 'PIX').toUpperCase(),
    status: (body.status || 'pago').trim(),
  }

  if (!secret) {
    const errMsg = 'Segredo SHOLVER_WEBHOOK_SECRET não encontrado no ambiente do backend.'
    $app.logger().error('Sholver Webhook:', 'error', errMsg)
    try {
      const col = $app.findCollectionByNameOrId('sholver_sync_logs')
      const rec = new Record(col)
      rec.set('numero_pedido', payload.numero_pedido)
      rec.set('evento', 'teste_manual')
      rec.set('status_pedido', payload.status)
      rec.set('metodo_pagamento', payload.metodo_pagamento)
      rec.set('valor', payload.valor)
      rec.set('http_status', 0)
      rec.set('sucesso', false)
      rec.set('request_payload', payload)
      rec.set('error', errMsg)
      $app.saveNoValidate(rec)
    } catch (_) {}
    return e.json(500, {
      success: false,
      error: errMsg,
      http_status: 0,
      payload_enviado: payload,
    })
  }

  let httpStatus = 0
  let resBody = null
  let rawBody = ''
  let requestError = ''

  try {
    const res = $http.send({
      url: SHOLVER_ENDPOINT,
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
      if (res.raw) {
        rawBody = String(res.raw || '').trim()
      } else if (res.body !== undefined && res.body !== null) {
        try {
          rawBody = new TextDecoder().decode(res.body).trim()
        } catch (_) {
          if (Array.isArray(res.body)) {
            rawBody = String.fromCharCode.apply(null, res.body).trim()
          } else {
            rawBody = String(res.body || '').trim()
          }
        }
      }

      if (res.json && typeof res.json === 'object') {
        resBody = res.json
      } else if (rawBody && (rawBody.startsWith('{') || rawBody.startsWith('['))) {
        try {
          resBody = JSON.parse(rawBody)
        } catch (_) {
          resBody = { raw: rawBody }
        }
      } else if (rawBody) {
        resBody = { raw: rawBody }
      }
    }
  } catch (httpErr) {
    requestError = httpErr.message || String(httpErr)
    $app.logger().error('Falha ao enviar webhook para Sholver:', 'error', requestError)
  }

  const sucesso = httpStatus >= 200 && httpStatus < 300

  try {
    const col = $app.findCollectionByNameOrId('sholver_sync_logs')
    const rec = new Record(col)
    rec.set('numero_pedido', payload.numero_pedido)
    if (body.condo_id) rec.set('condo_id', body.condo_id)
    if (body.licenca_id) rec.set('licenca_id', body.licenca_id)
    if (body.plano_id) rec.set('plano_id', body.plano_id)
    rec.set('evento', body.evento || 'teste_manual')
    rec.set('status_pedido', payload.status)
    rec.set('metodo_pagamento', payload.metodo_pagamento)
    rec.set('valor', payload.valor)
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
    $app.logger().error('Falha ao gravar log Sholver:', 'error', dbErr.message || dbErr)
  }

  return e.json(200, {
    disparo_executado: true,
    http_status: httpStatus,
    sucesso: sucesso,
    sholver_response: resBody || (rawBody ? { raw: rawBody } : null),
    request_error: requestError,
    payload_enviado: payload,
  })
})

routerAdd('GET', '/backend/v1/sholver/webhook/test', (e) => {
  const SHOLVER_ENDPOINT =
    'https://plataforma-skip-apps-98eed.shrd00.internal.goskip.dev/backend/v1/webhook/condpack'

  const secret =
    $os.getenv('SHOLVER_WEBHOOK_SECRET') ||
    ($secrets.has && $secrets.has('SHOLVER_WEBHOOK_SECRET')
      ? $secrets.get('SHOLVER_WEBHOOK_SECRET')
      : '')

  const payload = {
    numero_pedido: 'COND-2026-000123',
    cliente: {
      razao_social: 'Condomínio Exemplo LTDA',
      nome_fantasia: 'Condomínio Exemplo',
      email: 'contato@condominio.com.br',
      telefone: '27999999999',
      documento: '00.000.000/0000-00',
      endereco: 'Av. Exemplo, 123 - Vitória/ES, CEP 29000-000',
    },
    plano: {
      nome: 'Profissional',
    },
    produto: 'Condpack',
    valor: 199.9,
    metodo_pagamento: 'PIX',
    status: 'pago',
  }

  if (!secret) {
    const errMsg = 'Segredo SHOLVER_WEBHOOK_SECRET não encontrado no ambiente do backend.'
    $app.logger().error('Sholver Webhook:', 'error', errMsg)
    try {
      const col = $app.findCollectionByNameOrId('sholver_sync_logs')
      const rec = new Record(col)
      rec.set('numero_pedido', payload.numero_pedido)
      rec.set('evento', 'teste_manual_get')
      rec.set('status_pedido', payload.status)
      rec.set('metodo_pagamento', payload.metodo_pagamento)
      rec.set('valor', payload.valor)
      rec.set('http_status', 0)
      rec.set('sucesso', false)
      rec.set('request_payload', payload)
      rec.set('error', errMsg)
      $app.saveNoValidate(rec)
    } catch (_) {}
    return e.json(500, {
      success: false,
      error: errMsg,
      http_status: 0,
      payload_enviado: payload,
    })
  }

  let httpStatus = 0
  let resBody = null
  let rawBody = ''
  let requestError = ''

  try {
    const res = $http.send({
      url: SHOLVER_ENDPOINT,
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
      if (res.raw) {
        rawBody = String(res.raw || '').trim()
      } else if (res.body !== undefined && res.body !== null) {
        try {
          rawBody = new TextDecoder().decode(res.body).trim()
        } catch (_) {
          if (Array.isArray(res.body)) {
            rawBody = String.fromCharCode.apply(null, res.body).trim()
          } else {
            rawBody = String(res.body || '').trim()
          }
        }
      }

      if (res.json && typeof res.json === 'object') {
        resBody = res.json
      } else if (rawBody && (rawBody.startsWith('{') || rawBody.startsWith('['))) {
        try {
          resBody = JSON.parse(rawBody)
        } catch (_) {
          resBody = { raw: rawBody }
        }
      } else if (rawBody) {
        resBody = { raw: rawBody }
      }
    }
  } catch (httpErr) {
    requestError = httpErr.message || String(httpErr)
    $app.logger().error('Falha ao enviar webhook para Sholver via GET:', 'error', requestError)
  }

  const sucesso = httpStatus >= 200 && httpStatus < 300

  try {
    const col = $app.findCollectionByNameOrId('sholver_sync_logs')
    const rec = new Record(col)
    rec.set('numero_pedido', payload.numero_pedido)
    rec.set('evento', 'teste_manual_get')
    rec.set('status_pedido', payload.status)
    rec.set('metodo_pagamento', payload.metodo_pagamento)
    rec.set('valor', payload.valor)
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
    $app.logger().error('Falha ao gravar log Sholver via GET:', 'error', dbErr.message || dbErr)
  }

  return e.json(200, {
    disparo_executado: true,
    http_status: httpStatus,
    sucesso: sucesso,
    sholver_response: resBody || (rawBody ? { raw: rawBody } : null),
    request_error: requestError,
    payload_enviado: payload,
  })
})
