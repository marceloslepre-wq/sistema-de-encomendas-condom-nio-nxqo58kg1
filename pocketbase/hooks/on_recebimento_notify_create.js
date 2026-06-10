onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    const status = record.getString('status')
    const moradorId = record.getString('morador_id')
    let phone = ''

    if (moradorId) {
      try {
        const morador = $app.findRecordById('users', moradorId)
        phone = morador.getString('phone')
      } catch (_) {}
    }

    if (!phone) return e.next()

    let flowStage = ''
    if (status === 'ENTRADA_PORTARIA' || status === 'Validado' || status === 'Aprovação Manual') {
      flowStage = 'Entrada na portaria'
    } else if (status === 'EM_TRIAGEM') {
      flowStage = 'Em triagem na sala de encomendas'
    } else if (status === 'LIBERADO_RETIRADA') {
      flowStage = 'Processado e Liberado para Retirada'
    } else if (status === 'RETIRADO' || status === 'ENTREGUE') {
      flowStage = 'Encomenda Retirada'
    }

    if (!flowStage) return e.next()

    const templates = $app.findRecordsByFilter(
      'templates_notificacao',
      'flow_stage = {:stage} && ativo = true',
      '-created',
      1,
      0,
      { stage: flowStage },
    )

    if (templates.length === 0) return e.next()

    const template = templates[0].getString('mensagem_template')
    let moradorName = record.getString('morador') || ''
    if (!moradorName && moradorId) {
      try {
        moradorName = $app.findRecordById('users', moradorId).getString('name')
      } catch (_) {}
    }
    const tracking = record.getString('codigo_rastreio') || ''
    const code = record.getString('codigo_retirada') || ''

    let condoName = ''
    try {
      const units = $app.findRecordsByFilter('units', 'id = {:id}', '', 1, 0, {
        id: record.getString('unidade_id'),
      })
      if (units.length > 0) {
        const condos = $app.findRecordsByFilter('condos', 'id = {:id}', '', 1, 0, {
          id: units[0].getString('condo_id'),
        })
        if (condos.length > 0) condoName = condos[0].getString('name')
      }
    } catch (_) {}

    let message = template
      .replace(/{name}/g, moradorName)
      .replace(/{tracking}/g, tracking)
      .replace(/{code}/g, code)
      .replace(/{condoName}/g, condoName)

    const evolutionApiUrl = $secrets.get('EVOLUTION_API_URL') || ''
    const evolutionApiKey = $secrets.get('EVOLUTION_API_KEY') || ''
    const evolutionInstance = $secrets.get('EVOLUTION_INSTANCE') || ''

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      console.log('Evolution API not configured')
      return e.next()
    }

    let cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone
    }

    const payload = {
      number: cleanPhone,
      options: { delay: 1200, presence: 'composing' },
      textMessage: { text: message },
    }

    let url = evolutionApiUrl
    if (url.endsWith('/')) url = url.slice(0, -1)
    const endpoint = `${url}/message/sendText/${evolutionInstance}`

    let success = false
    let responseBody = null
    let statusCode = 0

    try {
      const res = $http.send({
        url: endpoint,
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionApiKey,
        },
        timeout: 15,
      })
      statusCode = res.statusCode
      success = res.statusCode >= 200 && res.statusCode < 300
      try {
        responseBody = res.json
      } catch (_) {}
    } catch (httpErr) {
      statusCode = 0
      responseBody = { error: httpErr.message }
    }

    try {
      const logs = $app.findCollectionByNameOrId('whatsapp_logs')
      const logRecord = new Record(logs)
      logRecord.set('phone', cleanPhone)
      logRecord.set('message', message)
      logRecord.set('status_code', statusCode)
      logRecord.set('response_body', responseBody)
      logRecord.set('success', success)
      $app.save(logRecord)
    } catch (_) {}
  } catch (err) {
    console.log('Error in notify create', err)
  }
  return e.next()
}, 'recebimentos_auditoria')
