onRecordAfterCreateSuccess((e) => {
  const status = e.record.getString('status')
  if (!status) return e.next()

  let templateMessage = ''
  try {
    const template = $app.findFirstRecordByData('templates_notificacao', 'flow_stage', status)
    if (!template.getBool('ativo')) return e.next()
    templateMessage = template.getString('mensagem_template')
  } catch (_) {
    return e.next()
  }
  if (!templateMessage) return e.next()

  let phone = ''
  let name = e.record.getString('morador')
  let torre = e.record.getString('unidade').split('-')[0]?.trim() || ''
  let apartamento = e.record.getString('unidade')
  let tracking = e.record.getString('codigo_rastreio') || ''
  let code = e.record.getString('codigo_retirada') || ''
  let condoName = ''

  try {
    const condo = $app.findRecordsByFilter('condos', '', '', 1)[0]
    if (condo) condoName = condo.getString('name')
  } catch (_) {}

  const moradorId = e.record.getString('morador_id')
  if (moradorId) {
    try {
      const user = $app.findRecordById('users', moradorId)
      phone = user.getString('phone') || phone
      name = user.getString('name') || name
      torre = user.getString('torre') || torre
      apartamento = user.getString('unidade') || apartamento
    } catch (_) {}
  }

  if (!phone && name) {
    try {
      const moradorRecord = $app.findFirstRecordByData('moradores', 'nome', name)
      phone = moradorRecord.getString('telefone') || phone
      torre = moradorRecord.getString('torre') || torre
      apartamento = moradorRecord.getString('apartamento') || apartamento
    } catch (_) {}
  }

  if (!phone) {
    try {
      const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
      const log = new Record(logCol)
      log.set('morador', name || 'Desconhecido')
      log.set('status', status)
      log.set('mensagem', 'Skipped: No phone number found')
      log.set('celular', '')
      log.set('sucesso', false)
      $app.saveNoValidate(log)
    } catch (err) {}
    return e.next()
  }

  const message = templateMessage
    .replace(/{nome}/g, name || 'Morador')
    .replace(/{name}/g, name || 'Morador')
    .replace(/{torre}/g, torre || '')
    .replace(/{apartamento}/g, apartamento || '')
    .replace(/{tracking}/g, tracking)
    .replace(/{code}/g, code)
    .replace(/{condoName}/g, condoName)

  let url = $secrets.get('EVOLUTION_API_URL')
  const instance = $secrets.get('EVOLUTION_INSTANCE')
  const apikey = $secrets.get('EVOLUTION_API_KEY')

  let success = false
  if (url && instance && apikey) {
    if (url.endsWith('/')) url = url.slice(0, -1)
    const endpoint = `${url}/message/sendText/${instance}`
    try {
      const res = $http.send({
        url: endpoint,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apikey },
        body: JSON.stringify({ number: phone, text: message }),
        timeout: 15,
      })
      if (res.statusCode >= 200 && res.statusCode < 300) {
        success = true
      } else {
        $app.logger().error('Evolution API return', 'status', res.statusCode, 'body', res.json)
      }
    } catch (err) {
      $app.logger().error('Evolution API error', 'error', err.message)
    }
  }

  try {
    const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
    const log = new Record(logCol)
    log.set('morador', name)
    log.set('status', status)
    log.set('mensagem', message)
    log.set('celular', phone)
    log.set('sucesso', success)
    $app.saveNoValidate(log)
  } catch (err) {
    $app.logger().error('Failed to log notification', 'error', err.message)
  }

  return e.next()
}, 'recebimentos_auditoria')
