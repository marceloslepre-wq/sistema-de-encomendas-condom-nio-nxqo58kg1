/*
  ====================================================================================================
  LEGACY ROUTE COMPATÍVEL COM EVOLUTION API (SKIP CLOUD)
  ====================================================================================================
  Esta rota é mantida por compatibilidade para clientes que ainda chamam:
  POST /backend/v1/whatsapp/send
  ====================================================================================================
*/

routerAdd(
  'POST',
  '/backend/v1/whatsapp/send',
  (e) => {
    function normalizeBrazilianNumber(input) {
      let digits = String(input || '').replace(/\D/g, '')
      digits = digits.replace(/^0+/, '')

      if (!digits.startsWith('55')) {
        digits = '55' + digits
      }

      return digits
    }

    if (e.request.method !== 'POST') {
      return e.json(405, { error: 'Method Not Allowed' })
    }

    const body = e.requestInfo().body || {}
    if (!body.phone) {
      return e.badRequestError('Phone is required')
    }

    // Secrets configuradas no Skip Cloud
    const globalUrl = $secrets.get('EVOLUTION_API_URL')
    const apiKey = $secrets.get('EVOLUTION_API_KEY')
    const globalInstance = $secrets.get('EVOLUTION_INSTANCE') || 'Encomenda'
    const globalSender = $secrets.get('EVOLUTION_NUMBER_SEND') || ''

    if (!globalUrl || !String(globalUrl).trim() || !apiKey || !String(apiKey).trim()) {
      const errorMsg = 'Missing Skip Cloud configuration for WhatsApp (URL or API_KEY)'
      $app.logger().error('Missing WhatsApp secrets', 'apiUrl', !!globalUrl, 'apiKey', !!apiKey)

      try {
        const phoneNum = normalizeBrazilianNumber(body.phone || '')
        const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
        const log = new Record(logCol)
        log.set('phone', phoneNum)
        log.set('message', body.message || 'Mensagem padrão')
        log.set('status_code', 500)
        log.set('response_body', { error: errorMsg })
        log.set('success', false)
        $app.saveNoValidate(log)
      } catch (err) {}

      return e.internalServerError(errorMsg)
    }

    // Identificar condomínio para resolução dinâmica
    let condoId = body.condo_id || ''
    const auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!condoId && auth) {
      condoId = auth.getString('condo_id') || ''
    }

    // Resolução dinâmica da instância com fallback restrito ao Condomínio Residencial Parque
    let targetInstance = ''
    let senderNumber = globalSender
    let shouldSend = false

    if (condoId) {
      try {
        const condo = $app.findRecordById('condos', condoId)
        if (condo && condo.getBool('whatsapp_connected')) {
          const inst = (condo.getString('whatsapp_instance_name') || '').trim()
          const cPhone = (condo.getString('whatsapp_phone') || '').trim()
          if (inst) {
            targetInstance = inst
            if (cPhone) senderNumber = cPhone
            shouldSend = true
          }
        } else if (condo) {
          const cId = condo.id || ''
          const cName = (condo.getString('name') || '').trim().toLowerCase()
          const isDemo = cId === 'cjvbjhk0senz1yt' || cName.indexOf('residencial parque') !== -1
          if (isDemo) {
            targetInstance = globalInstance
            shouldSend = true
          }
        }
      } catch (_) {}
    }

    if (!shouldSend || !targetInstance) {
      return e.json(200, {
        success: true,
        skipped: true,
        message: 'Condomínio desconectado e não é o condomínio de teste. Envio pulado.',
      })
    }

    const baseUrl = String(globalUrl).replace(/\/+$/, '')
    const url = `${baseUrl}/message/sendText/${targetInstance}`

    const phoneNum = normalizeBrazilianNumber(body.phone)
    if (phoneNum.length < 12 || phoneNum.length > 13) {
      return e.badRequestError('Phone must be in format 55 + DDD + number')
    }

    const tipo = body.tipo || 'codigo'

    let code = ''
    let originalMessage = body.message || 'Mensagem padrão'

    if (tipo === 'codigo') {
      code = $security.randomStringWithAlphabet(6, '0123456789')
      originalMessage = `Seu código de validação é: ${code}`
      const expires = new Date()
      expires.setMinutes(expires.getMinutes() + 15)

      try {
        const verifCol = $app.findCollectionByNameOrId('whatsapp_verifications')
        const verif = new Record(verifCol)
        verif.set('phone', phoneNum)
        verif.set('code', code)
        verif.set('expires_at', expires.toISOString().replace('T', ' '))
        verif.set('used', false)
        verif.set('attempts', 0)
        if (condoId) verif.set('condo_id', condoId)
        $app.save(verif)
      } catch (err) {
        $app
          .logger()
          .error('Failed to save whatsapp verification', 'error', err.message || String(err))
      }
    }

    try {
      let logStatus = 'error'

      const res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: phoneNum, text: originalMessage }),
        timeout: 10,
      })

      let rawText = ''
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

      let parsedJson = null
      let parseFailed = false

      try {
        parsedJson = JSON.parse(rawText)
      } catch (parseErr) {
        parseFailed = true
      }

      const isSuccess = res.statusCode >= 200 && res.statusCode < 300

      if (isSuccess) {
        logStatus = 'success'
      } else {
        logStatus = parsedJson && parsedJson.error ? String(parsedJson.error) : rawText || 'error'
        $app.logger().error('Evolution API Error', 'status', res.statusCode, 'body', rawText)
      }

      try {
        const logCol = $app.findCollectionByNameOrId('whatsapp_logs')
        const log = new Record(logCol)
        log.set('phone', phoneNum)
        log.set('message', originalMessage)
        log.set('status_code', res.statusCode)
        log.set('success', isSuccess)
        if (condoId) log.set('condo_id', condoId)
        if (parsedJson) {
          log.set('response_body', parsedJson)
        } else {
          log.set('response_body', { error: logStatus })
        }
        $app.saveNoValidate(log)
      } catch (logErr) {
        $app
          .logger()
          .error('Failed to save whatsapp log', 'error', logErr.message || String(logErr))
      }

      try {
        const notifCol = $app.findCollectionByNameOrId('notificacoes_enviadas')
        const notif = new Record(notifCol)
        notif.set('morador', 'Desconhecido')
        notif.set('status', isSuccess ? 'enviado' : 'falha')
        notif.set('mensagem', originalMessage)
        notif.set('celular', phoneNum)
        notif.set('sucesso', isSuccess)
        notif.set('sender_match', true)
        notif.set('sender_number', senderNumber)
        if (condoId) notif.set('condo_id', condoId)
        $app.save(notif)
      } catch (notifErr) {
        $app
          .logger()
          .error(
            'Failed to save notificacoes_enviadas',
            'error',
            notifErr.message || String(notifErr),
          )
      }

      if (parseFailed) {
        const statusCode = isSuccess ? 400 : res.statusCode
        return e.json(statusCode, {
          success: false,
          message: rawText || 'Failed to parse API response',
          raw_error: rawText,
        })
      }

      if (!isSuccess) {
        return e.json(res.statusCode, {
          success: false,
          message: logStatus,
          error: logStatus,
          data: parsedJson,
        })
      }

      return e.json(200, {
        success: true,
        data: parsedJson,
      })
    } catch (err) {
      $app.logger().error('Evolution API Request Global Error', 'error', err.message || String(err))
      return e.json(500, {
        success: false,
        catch_error: err.message || String(err),
      })
    }
  },
  $apis.requireAuth(),
)
