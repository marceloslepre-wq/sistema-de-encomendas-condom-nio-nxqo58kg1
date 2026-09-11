onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    const status = record.getString('status')
    const moradorId = record.getString('morador_id')
    let phone = ''
    let moradorName = record.getString('morador') || ''

    if (moradorId) {
      try {
        const morador = $app.findRecordById('users', moradorId)
        phone = morador.getString('phone')
        if (!moradorName) moradorName = morador.getString('name')
      } catch (_) {}
    }

    if (!phone) return e.next()

    let flowStage = ''
    if (
      status === 'ENTRADA_PORTARIA' ||
      status === 'Entrada na portaria' ||
      status === 'Recebido' ||
      status === 'Validado' ||
      status === 'Aprovação Manual'
    ) {
      flowStage = 'Entrada na portaria'
    } else if (status === 'EM_TRIAGEM') {
      flowStage = 'Em triagem na sala de encomendas'
    } else if (status === 'LIBERADO_RETIRADA') {
      flowStage = 'Processado e Liberado para Retirada'
    } else if (status === 'RETIRADO' || status === 'ENTREGUE') {
      flowStage = 'Encomenda Retirada'
    }

    if (!flowStage) return e.next()

    let recordCondoId = record.getString('condo_id') || ''
    let templateFilter = 'flow_stage = {:stage} && ativo = true'
    let templateBind = { stage: flowStage }
    if (recordCondoId) {
      templateFilter += ' && (condo_id = {:condoId} || condo_id = "" || condo_id = null)'
      templateBind.condoId = recordCondoId
    }

    const templates = $app.findRecordsByFilter(
      'templates_notificacao',
      templateFilter,
      '-created',
      1,
      0,
      templateBind,
    )

    if (templates.length === 0) return e.next()

    const template = templates[0].getString('mensagem_template')
    const tracking = record.getString('codigo_rastreio') || ''
    const code = record.getString('codigo_retirada') || ''

    let condoName = ''
    let condoRecord = null
    try {
      if (recordCondoId) {
        condoRecord = $app.findRecordById('condos', recordCondoId)
      } else {
        const units = $app.findRecordsByFilter('units', 'id = {:id}', '', 1, 0, {
          id: record.getString('unidade_id'),
        })
        if (units.length > 0) {
          recordCondoId = units[0].getString('condo_id')
          if (recordCondoId) {
            condoRecord = $app.findRecordById('condos', recordCondoId)
          }
        }
      }
      if (condoRecord) {
        condoName = condoRecord.getString('name')
      }
    } catch (_) {}

    let message = template
      .replace(/{name}/g, moradorName)
      .replace(/{tracking}/g, tracking)
      .replace(/{code}/g, code)
      .replace(/{condoName}/g, condoName)

    const evolutionApiUrl = $secrets.get('EVOLUTION_API_URL') || ''
    const evolutionApiKey = $secrets.get('EVOLUTION_API_KEY') || ''
    const globalInstance = $secrets.get('EVOLUTION_INSTANCE') || 'Encomenda'
    const globalSender = $secrets.get('EVOLUTION_NUMBER_SEND') || ''

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.log('Evolution API not fully configured, missing EVOLUTION_API_KEY or URL')
      try {
        const logs = $app.findCollectionByNameOrId('whatsapp_logs')
        const logRecord = new Record(logs)
        let fallbackPhone = phone.replace(/\D/g, '')
        if (!fallbackPhone.startsWith('55') && fallbackPhone.length > 0)
          fallbackPhone = '55' + fallbackPhone
        logRecord.set('phone', fallbackPhone)
        logRecord.set('message', message)
        logRecord.set('status_code', 500)
        logRecord.set('response_body', {
          error: 'Missing EVOLUTION_API_KEY or URL configuration',
        })
        logRecord.set('success', false)
        if (recordCondoId) logRecord.set('condo_id', recordCondoId)
        $app.saveNoValidate(logRecord)
      } catch (_) {}
      return e.next()
    }

    // Resolução dinâmica de instância do condomínio:
    // Se tiver instância própria conectada -> usa ela
    // Se NÃO tiver -> usa a instância "Encomendas" APENAS se o condomínio for o "Condomínio Residencial Parque"
    // Para qualquer outro condomínio desconectado -> NÃO enviar (pular silenciosamente sem quebrar o fluxo)
    let targetInstance = ''
    let senderNumber = globalSender
    let shouldSend = false

    if (condoRecord && condoRecord.getBool('whatsapp_connected')) {
      const cInst = (condoRecord.getString('whatsapp_instance_name') || '').trim()
      const cPhone = (condoRecord.getString('whatsapp_phone') || '').trim()
      if (cInst) {
        targetInstance = cInst
        if (cPhone) senderNumber = cPhone
        shouldSend = true
      }
    } else if (condoRecord) {
      const cId = condoRecord.id || ''
      const cName = (condoRecord.getString('name') || '').trim().toLowerCase()
      const isDemo = cId === 'cjvbjhk0senz1yt' || cName.indexOf('residencial parque') !== -1
      if (isDemo) {
        targetInstance = globalInstance
        shouldSend = true
      }
    }

    if (!shouldSend || !targetInstance) {
      console.log(
        'WhatsApp envio create pulado: condomínio desconectado e não é o condomínio de teste',
      )
      return e.next()
    }

    let cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone.startsWith('55') && cleanPhone.length > 0) {
      cleanPhone = '55' + cleanPhone
    }

    const payload = {
      number: cleanPhone,
      text: message,
    }

    let url = evolutionApiUrl
    if (url.endsWith('/')) url = url.slice(0, -1)
    const endpoint = `${url}/message/sendText/${targetInstance}`

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
      } catch (_) {
        if (res.body) {
          responseBody = new TextDecoder().decode(res.body)
        }
      }
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
      if (recordCondoId) logRecord.set('condo_id', recordCondoId)
      $app.saveNoValidate(logRecord)
    } catch (_) {}

    try {
      const notifLogs = $app.findCollectionByNameOrId('notificacoes_enviadas')
      const notifRecord = new Record(notifLogs)
      notifRecord.set('morador', moradorName || 'Desconhecido')
      notifRecord.set('status', 'AUTOMATICO')
      notifRecord.set('mensagem', message)
      notifRecord.set('celular', cleanPhone)
      notifRecord.set('sucesso', success)
      notifRecord.set('sender_match', true)
      notifRecord.set('sender_number', senderNumber)
      if (recordCondoId) notifRecord.set('condo_id', recordCondoId)
      $app.saveNoValidate(notifRecord)
    } catch (_) {}
  } catch (err) {
    console.log('Error in notify create', err)
  }
  return e.next()
}, 'recebimentos_auditoria')
