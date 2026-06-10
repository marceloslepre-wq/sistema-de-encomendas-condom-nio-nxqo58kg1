onRecordAfterCreateSuccess((e) => {
  const status = e.record.getString('status')
  if (!status) return e.next()

  let templates
  try {
    templates = $app.findRecordsByFilter(
      'templates_notificacao',
      'flow_stage = {:status} && ativo = true',
      '',
      1,
      0,
      { status },
    )
  } catch (err) {
    return e.next()
  }

  if (!templates || templates.length === 0) return e.next()

  const template = templates[0]
  const templateStr = template.getString('mensagem_template')
  if (!templateStr) return e.next()

  const moradorId = e.record.getString('morador_id')
  let phone = ''
  let nome = e.record.getString('morador')
  let unidade = e.record.getString('unidade')
  let torre = ''
  let condoName = ''

  try {
    const condo = $app.findRecordsByFilter('condos', '', '', 1)[0]
    if (condo) condoName = condo.getString('name')
  } catch (_) {}

  if (moradorId) {
    try {
      const user = $app.findRecordById('users', moradorId)
      phone = user.getString('phone') || phone
      nome = user.getString('name') || nome
      unidade = user.getString('unidade') || unidade
      torre = user.getString('torre') || torre
    } catch (_) {}
  }

  if (!phone && nome) {
    try {
      const moradorRecord = $app.findFirstRecordByData('moradores', 'nome', nome)
      phone = moradorRecord.getString('telefone') || phone
    } catch (_) {}
  }

  if (!phone) {
    $app.logger().info('Notification skipped: no phone found', 'recebimento_id', e.record.id)
    try {
      const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
      const log = new Record(logCol)
      log.set('morador', nome || 'Desconhecido')
      log.set('status', status)
      log.set('mensagem', 'Falha: Celular não encontrado ou ausente')
      log.set('celular', 'N/A')
      log.set('sucesso', false)
      $app.saveNoValidate(log)
    } catch (err) {}
    return e.next()
  }

  const codigo_rastreio = e.record.getString('codigo_rastreio') || ''
  const codigo_retirada = e.record.getString('codigo_retirada') || ''

  const message = templateStr
    .replace(/{nome}/g, nome || 'Morador')
    .replace(/{name}/g, nome || 'Morador')
    .replace(/{unidade}/g, unidade)
    .replace(/{torre}/g, torre)
    .replace(/{codigo}/g, codigo_retirada)
    .replace(/{codigo_rastreio}/g, codigo_rastreio)
    .replace(/{tracking}/g, codigo_rastreio)
    .replace(/{code}/g, codigo_retirada)
    .replace(/{condoName}/g, condoName)

  let digits = String(phone || '').replace(/\D/g, '')
  digits = digits.replace(/^0+/, '')
  if (!digits.startsWith('55') && digits.length > 0) {
    digits = '55' + digits
  }
  const phoneNum = digits || phone

  let success = false
  let logStatus = 'error'
  let rawText = ''
  let parsedJson = null

  let url = $secrets.get('EVOLUTION_API_URL')
  const instance = $secrets.get('EVOLUTION_INSTANCE')
  const apikey = $secrets.get('EVOLUTION_API_KEY')
  const senderNumber = $secrets.get('EVOLUTION_NUMERO_SENDER') || ''

  if (url && instance && apikey) {
    if (url.endsWith('/')) url = url.slice(0, -1)
    const endpoint = `${url}/message/sendText/${instance}`

    try {
      const res = $http.send({
        url: endpoint,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apikey },
        body: JSON.stringify({ number: phoneNum, text: message }),
        timeout: 15,
      })

      try {
        if (res.body) {
          rawText = new TextDecoder().decode(res.body)
        }
      } catch (decodeErr) {
        if (Array.isArray(res.body)) {
          rawText = String.fromCharCode.apply(null, res.body)
        } else {
          rawText = String(res.body)
        }
      }

      try {
        parsedJson = JSON.parse(rawText)
      } catch (parseErr) {}

      if (res.statusCode >= 200 && res.statusCode < 300) {
        success = true
        logStatus = 'success'
      } else {
        logStatus = parsedJson && parsedJson.error ? String(parsedJson.error) : rawText || 'error'
        $app
          .logger()
          .error('Evolution API rejected (Create)', 'status', res.statusCode, 'body', rawText)
      }
    } catch (err) {
      logStatus = err.message || 'error'
      $app.logger().error('Evolution API error (Create)', 'error', logStatus)
    }
  } else {
    logStatus = 'API não configurada (secrets ausentes)'
  }

  try {
    const waLogCol = $app.findCollectionByNameOrId('whatsapp_logs')
    const waLog = new Record(waLogCol)
    waLog.set('phone', phoneNum)
    waLog.set('message', message)
    waLog.set('tipo', 'notificacao_status')
    waLog.set('status', logStatus)
    waLog.set('success', success)
    if (parsedJson) waLog.set('response_body', parsedJson)
    $app.saveNoValidate(waLog)
  } catch (err) {
    $app.logger().error('Failed to save whatsapp log', 'error', err.message)
  }

  try {
    const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
    const log = new Record(logCol)
    log.set('morador', nome || 'Desconhecido')
    log.set('status', status)
    log.set('mensagem', message)
    log.set('celular', phoneNum)
    log.set('sucesso', success)
    log.set('sender_match', true)
    log.set('sender_number', senderNumber)
    $app.saveNoValidate(log)
  } catch (err) {
    $app.logger().error('Failed to log notification', 'error', err.message)
  }

  return e.next()
}, 'recebimentos_auditoria')
