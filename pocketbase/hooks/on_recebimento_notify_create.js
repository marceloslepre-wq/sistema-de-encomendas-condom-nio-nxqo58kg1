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

  let success = false
  let url = $secrets.get('EVOLUTION_API_URL')
  const instance = $secrets.get('EVOLUTION_INSTANCE')
  const apikey = $secrets.get('EVOLUTION_API_KEY')

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
        $app.logger().error('Evolution API rejected (Create)', 'status', res.statusCode)
      }
    } catch (err) {
      $app.logger().error('Evolution API error (Create)', 'error', err.message)
    }
  }

  try {
    const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
    const log = new Record(logCol)
    log.set('morador', nome || 'Desconhecido')
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
