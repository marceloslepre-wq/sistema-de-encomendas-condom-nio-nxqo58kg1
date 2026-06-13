// @deps date-fns@4.1.0
cronAdd('send_reminders', '0 * * * *', () => {
  let url = $secrets.get('EVOLUTION_API_URL')
  const instance = $secrets.get('EVOLUTION_INSTANCE')
  const apikey = $secrets.get('EVOLUTION_API_KEY')
  const senderNumber = $secrets.get('EVOLUTION_NUMBER_SEND') || ''

  if (!url || !instance || !apikey) return

  if (url.endsWith('/')) url = url.slice(0, -1)
  const endpoint = `${url}/message/sendText/${instance}`

  const templates = $app.findRecordsByFilter(
    'templates_notificacao',
    "flow_stage = 'LEMBRETE' && ativo = true",
    '',
    1,
  )
  if (!templates || templates.length === 0) return

  const template = templates[0]
  const freqDays = template.getInt('reminder_frequency') || 1
  const remTime = template.getString('reminder_time') || '09:00'

  const now = new Date()
  const localHour = (now.getUTCHours() - 3 + 24) % 24
  const targetHour = parseInt(remTime.split(':')[0] || '9', 10)

  if (localHour !== targetHour) return

  const records = $app.findRecordsByFilter(
    'recebimentos_auditoria',
    "status = 'LIBERADO_RETIRADA'",
    '',
    1000,
  )

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const lastSentStr = record.getString('last_reminder_sent')
    let lastSent = lastSentStr ? new Date(lastSentStr) : new Date(record.getString('updated'))

    const diffTime = now.getTime() - lastSent.getTime()
    const diffHours = diffTime / (1000 * 60 * 60)

    if (diffHours >= freqDays * 24 - 1) {
      let phone = ''
      let name = record.getString('morador')
      let tracking = record.getString('codigo_rastreio') || ''
      let code = record.getString('codigo_retirada') || ''
      let unidade = record.getString('unidade') || ''
      let torre = ''
      let condoName = ''

      try {
        const condo = $app.findRecordsByFilter('condos', '', '', 1)[0]
        if (condo) condoName = condo.getString('name')
      } catch (_) {}

      const moradorId = record.getString('morador_id')
      if (moradorId) {
        try {
          const user = $app.findRecordById('users', moradorId)
          phone = user.getString('phone') || phone
          name = user.getString('name') || name
          unidade = user.getString('unidade') || unidade
          torre = user.getString('torre') || torre
        } catch (_) {}
      }

      if (!phone && name) {
        try {
          const moradorRecord = $app.findFirstRecordByData('moradores', 'nome', name)
          phone = moradorRecord.getString('telefone') || phone
        } catch (_) {}
      }

      if (!phone) {
        try {
          const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
          const log = new Record(logCol)
          log.set('morador', name || 'Desconhecido')
          log.set('status', 'LEMBRETE')
          log.set('mensagem', 'Falha: Celular não encontrado ou ausente')
          log.set('celular', 'N/A')
          log.set('sucesso', false)
          $app.saveNoValidate(log)
        } catch (err) {}
        continue
      }

      const message = template
        .getString('mensagem_template')
        .replace(/{nome}/g, name || 'Morador')
        .replace(/{name}/g, name || 'Morador')
        .replace(/{unidade}/g, unidade)
        .replace(/{torre}/g, torre)
        .replace(/{codigo}/g, code)
        .replace(/{codigo_rastreio}/g, tracking)
        .replace(/{tracking}/g, tracking)
        .replace(/{code}/g, code)
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
            .error('Evolution API rejected (Reminder)', 'status', res.statusCode, 'body', rawText)
        }
      } catch (err) {
        logStatus = err.message || 'error'
        $app.logger().error('Evolution API error (Reminder)', 'error', logStatus)
      }

      try {
        const waLogCol = $app.findCollectionByNameOrId('whatsapp_logs')
        const waLog = new Record(waLogCol)
        waLog.set('phone', phoneNum)
        waLog.set('message', message)
        waLog.set('tipo', 'lembrete')
        waLog.set('status', logStatus)
        waLog.set('success', success)
        if (parsedJson) waLog.set('response_body', parsedJson)
        $app.saveNoValidate(waLog)
      } catch (err) {}

      try {
        const logCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
        const log = new Record(logCol)
        log.set('morador', name)
        log.set('status', 'LEMBRETE')
        log.set('mensagem', message)
        log.set('celular', phoneNum)
        log.set('sucesso', success)
        log.set('sender_match', true)
        log.set('sender_number', senderNumber)
        $app.saveNoValidate(log)
      } catch (err) {}

      record.set('last_reminder_sent', now.toISOString())
      $app.saveNoValidate(record)
    }
  }
})
