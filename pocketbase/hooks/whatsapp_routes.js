/*
  ====================================================================================================
  ROTAS DE GESTÃO MULTI-INSTÂNCIA DO WHATSAPP (EVOLUTION API v2)
  ====================================================================================================
  Rotas registradas:
  1. POST   /backend/v1/whatsapp/conectar   - Cria ou reaproveita instância, busca QR Code e retorna ao gestor
  2. GET    /backend/v1/whatsapp/status     - Consulta connectionState na Evolution e atualiza condomínio
  3. POST   /backend/v1/whatsapp/desconectar- Executa logout da instância na Evolution
  ====================================================================================================
  ATENÇÃO: Toda a lógica e helpers ficam INLINE dentro de cada callback de rota (PocketBase JSVM pool).
  ====================================================================================================
*/

// 1. CONECTAR
routerAdd(
  'POST',
  '/backend/v1/whatsapp/conectar',
  (e) => {
    // Helper inline: normalizar URL
    var normalizeUrl = function (url) {
      var u = String(url || '').trim()
      if (u && !/^https?:\/\//i.test(u)) {
        u = 'https://' + u
      }
      while (u.endsWith('/')) {
        u = u.slice(0, -1)
      }
      return u
    }

    // Helper inline: decode seguro de resposta http
    var decodeHttp = function (res) {
      var rawText = ''
      try {
        if (res && res.body !== undefined && res.body !== null) {
          if (typeof res.body === 'string') {
            rawText = res.body
          } else {
            try {
              rawText = new TextDecoder().decode(res.body)
            } catch (_) {
              if (Array.isArray(res.body)) {
                rawText = String.fromCharCode.apply(null, res.body)
              } else {
                rawText = String(res.body)
              }
            }
          }
        }
      } catch (_) {
        rawText = ''
      }

      var json = null
      if (res && res.json && typeof res.json === 'object') {
        json = res.json
      } else if (rawText) {
        try {
          json = JSON.parse(rawText)
        } catch (_) {
          json = null
        }
      }

      return {
        statusCode: res ? res.statusCode : null,
        raw: rawText,
        json: json,
      }
    }

    // Helper inline: extrair QR code
    var extractQr = function (parsed) {
      if (!parsed || !parsed.json) return ''
      var j = parsed.json

      if (j.qrcode && typeof j.qrcode === 'object' && j.qrcode.base64) {
        return j.qrcode.base64
      }
      if (j.base64 && typeof j.base64 === 'string') {
        return j.base64
      }
      if (j.qrcode && typeof j.qrcode === 'string' && j.qrcode.indexOf('data:image') === 0) {
        return j.qrcode
      }
      if (j.code && typeof j.code === 'string' && j.code.indexOf('data:image') === 0) {
        return j.code
      }
      return ''
    }

    // Helper inline: formatar mensagem de erro
    var formatError = function (parsed, fallback) {
      if (!parsed) return fallback || 'Falha de comunicação com a Evolution API.'
      var status = parsed.statusCode || 'Erro'
      if (status === 401 || status === 403) {
        return (
          'Evolution API rejeitou a autenticação (HTTP ' +
          status +
          '): verifique se a EVOLUTION_API_KEY configurada é a GLOBAL (manager) e não de uma instância específica.'
        )
      }
      var json = parsed.json
      if (json) {
        if (json.response && typeof json.response === 'string') {
          return json.response + ' (HTTP ' + status + ')'
        }
        if (json.response && json.response.message) {
          var m = json.response.message
          return (Array.isArray(m) ? m.join(', ') : String(m)) + ' (HTTP ' + status + ')'
        }
        if (json.message) {
          var msg = json.message
          return (Array.isArray(msg) ? msg.join(', ') : String(msg)) + ' (HTTP ' + status + ')'
        }
        if (json.error) {
          return String(json.error) + ' (HTTP ' + status + ')'
        }
      }
      if (parsed.raw && parsed.raw.length < 200) {
        return parsed.raw + ' (HTTP ' + status + ')'
      }
      return fallback || 'Evolution API retornou status HTTP ' + status
    }

    // Autenticação
    var auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        var rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        var token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    var role = auth.getString('role')
    var body = e.requestInfo().body || {}
    var targetCondoId = auth.getString('condo_id')

    // Master/Admin pode especificar condo_id no body
    if ((role === 'master' || role === 'admin') && body.condo_id) {
      targetCondoId = body.condo_id
    }

    if (!targetCondoId) {
      return e.badRequestError('Condomínio não informado ou usuário sem condomínio vinculado.')
    }

    var condo = null
    try {
      condo = $app.findRecordById('condos', targetCondoId)
    } catch (err) {
      return e.notFoundError('Condomínio não encontrado: ' + targetCondoId)
    }

    var rawUrl = $secrets.get('EVOLUTION_API_URL') || $os.getenv('EVOLUTION_API_URL') || ''
    var apiUrl = normalizeUrl(rawUrl)
    var apiKey = ($secrets.get('EVOLUTION_API_KEY') || $os.getenv('EVOLUTION_API_KEY') || '').trim()

    if (!apiUrl || !apiKey) {
      $app
        .logger()
        .error('WhatsApp Conectar: credenciais ausentes', 'hasUrl', !!apiUrl, 'hasKey', !!apiKey)
      return e.json(500, {
        success: false,
        error:
          'Evolution API não configurada no servidor (EVOLUTION_API_URL ou EVOLUTION_API_KEY ausente).',
      })
    }

    var instanceName = 'condo-' + targetCondoId
    var qrCodeData = ''
    var lastErrorReason = ''

    $app
      .logger()
      .info(
        'WhatsApp Conectar: iniciando fluxo',
        'condoId',
        targetCondoId,
        'instanceName',
        instanceName,
        'apiUrl',
        apiUrl,
      )

    // 1. Criar a instância na Evolution API (/instance/create)
    var createUrl = apiUrl + '/instance/create'
    var createPayload = {
      instanceName: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }

    var parsedCreate = null
    try {
      var createRes = $http.send({
        url: createUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify(createPayload),
        timeout: 15,
      })

      parsedCreate = decodeHttp(createRes)
      $app
        .logger()
        .info(
          'Evolution /instance/create resposta',
          'status',
          parsedCreate.statusCode,
          'body',
          parsedCreate.raw.substring(0, 300),
        )

      if (parsedCreate.statusCode >= 200 && parsedCreate.statusCode < 300) {
        qrCodeData = extractQr(parsedCreate)
      } else {
        lastErrorReason = formatError(
          parsedCreate,
          'Falha ao criar instância (/instance/create HTTP ' + parsedCreate.statusCode + ')',
        )
      }
    } catch (createErr) {
      lastErrorReason = createErr.message || String(createErr)
      $app
        .logger()
        .warn(
          'Evolution /instance/create exceção (tentará fallback para connect)',
          'error',
          lastErrorReason,
        )
    }

    // 2. Se não pegou QR Code no create, chamar /instance/connect/{instanceName}
    if (!qrCodeData) {
      var connectUrl = apiUrl + '/instance/connect/' + encodeURIComponent(instanceName)
      var parsedConnect = null
      try {
        var connectRes = $http.send({
          url: connectUrl,
          method: 'GET',
          headers: {
            apikey: apiKey,
          },
          timeout: 15,
        })

        parsedConnect = decodeHttp(connectRes)
        $app
          .logger()
          .info(
            'Evolution /instance/connect resposta',
            'status',
            parsedConnect.statusCode,
            'body',
            parsedConnect.raw.substring(0, 300),
          )

        if (parsedConnect.statusCode >= 200 && parsedConnect.statusCode < 300) {
          qrCodeData = extractQr(parsedConnect)
        } else {
          var connErr = formatError(
            parsedConnect,
            'Falha ao obter QR Code (/instance/connect HTTP ' + parsedConnect.statusCode + ')',
          )
          // Se create já tinha dado erro de autenticação (401/403), preserva-o
          if (
            !lastErrorReason ||
            parsedConnect.statusCode === 401 ||
            parsedConnect.statusCode === 403
          ) {
            lastErrorReason = connErr
          }
        }
      } catch (connErr) {
        if (!lastErrorReason) {
          lastErrorReason = connErr.message || String(connErr)
        }
        $app
          .logger()
          .warn('Evolution /instance/connect exceção', 'error', connErr.message || String(connErr))
      }
    }

    // 3. Atualizar o condomínio no banco
    try {
      condo.set('whatsapp_instance_name', instanceName)
      if (qrCodeData) {
        condo.set('whatsapp_status', 'connecting')
        condo.set('whatsapp_qrcode', qrCodeData)
      }
      condo.set('whatsapp_updated_at', new Date().toISOString())
      $app.saveNoValidate(condo)
    } catch (saveErr) {
      $app
        .logger()
        .error(
          'Falha ao salvar status whatsapp no condo',
          'error',
          saveErr.message || String(saveErr),
        )
    }

    // 4. Se ainda assim não obtivemos QR Code, retornar erro descritivo ao invés de success: true vazio
    if (!qrCodeData) {
      var friendlyError =
        lastErrorReason ||
        'A Evolution API não retornou o QR Code. Verifique se o serviço está ativo e se a chave global é válida.'

      $app
        .logger()
        .error(
          'WhatsApp Conectar FALHOU: QR Code vazio',
          'condoId',
          targetCondoId,
          'error',
          friendlyError,
        )

      return e.json(400, {
        success: false,
        instanceName: instanceName,
        status: condo.getString('whatsapp_status') || 'disconnected',
        error: friendlyError,
      })
    }

    return e.json(200, {
      success: true,
      instanceName: instanceName,
      status: 'connecting',
      qrcode: qrCodeData,
    })
  },
  $apis.requireAuth(),
)

// 2. CONSULTAR STATUS
routerAdd(
  'GET',
  '/backend/v1/whatsapp/status',
  (e) => {
    // Helper inline: normalizar URL
    var normalizeUrl = function (url) {
      var u = String(url || '').trim()
      if (u && !/^https?:\/\//i.test(u)) {
        u = 'https://' + u
      }
      while (u.endsWith('/')) {
        u = u.slice(0, -1)
      }
      return u
    }

    // Helper inline: decode seguro de resposta http
    var decodeHttp = function (res) {
      var rawText = ''
      try {
        if (res && res.body !== undefined && res.body !== null) {
          if (typeof res.body === 'string') {
            rawText = res.body
          } else {
            try {
              rawText = new TextDecoder().decode(res.body)
            } catch (_) {
              if (Array.isArray(res.body)) {
                rawText = String.fromCharCode.apply(null, res.body)
              } else {
                rawText = String(res.body)
              }
            }
          }
        }
      } catch (_) {
        rawText = ''
      }

      var json = null
      if (res && res.json && typeof res.json === 'object') {
        json = res.json
      } else if (rawText) {
        try {
          json = JSON.parse(rawText)
        } catch (_) {
          json = null
        }
      }

      return {
        statusCode: res ? res.statusCode : null,
        raw: rawText,
        json: json,
      }
    }

    var auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        var rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        var token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    var role = auth.getString('role')
    var queryCondoId = e.request.url.query().get('condo_id') || ''
    var targetCondoId = auth.getString('condo_id')

    if ((role === 'master' || role === 'admin') && queryCondoId) {
      targetCondoId = queryCondoId
    }

    if (!targetCondoId) {
      return e.badRequestError('Condomínio não informado.')
    }

    var condo = null
    try {
      condo = $app.findRecordById('condos', targetCondoId)
    } catch (err) {
      return e.notFoundError('Condomínio não encontrado: ' + targetCondoId)
    }

    var rawUrl = $secrets.get('EVOLUTION_API_URL') || $os.getenv('EVOLUTION_API_URL') || ''
    var apiUrl = normalizeUrl(rawUrl)
    var apiKey = ($secrets.get('EVOLUTION_API_KEY') || $os.getenv('EVOLUTION_API_KEY') || '').trim()

    var instanceName = (condo.getString('whatsapp_instance_name') || '').trim()
    if (!instanceName) {
      instanceName = 'condo-' + targetCondoId
    }

    var currentStatus = condo.getString('whatsapp_status') || 'disconnected'
    var currentConnected = condo.getBool('whatsapp_connected')
    var currentPhone = condo.getString('whatsapp_phone') || ''
    var currentQrcode = condo.getString('whatsapp_qrcode') || ''

    if (!apiUrl || !apiKey) {
      return e.json(200, {
        instanceName: instanceName,
        status: currentStatus,
        connected: currentConnected,
        phone: currentPhone,
        qrcode: currentQrcode,
        evolutionConfigured: false,
      })
    }

    var evolutionState = null
    var detectedPhone = currentPhone
    var stateHttpCode = null

    // Consultar Evolution GET /instance/connectionState/{instance}
    try {
      var stateUrl = apiUrl + '/instance/connectionState/' + encodeURIComponent(instanceName)
      var stateRes = $http.send({
        url: stateUrl,
        method: 'GET',
        headers: {
          apikey: apiKey,
        },
        timeout: 10,
      })

      var parsedState = decodeHttp(stateRes)
      stateHttpCode = parsedState.statusCode

      if (parsedState.json && parsedState.json.instance) {
        evolutionState = parsedState.json.instance.state
      } else if (parsedState.json && parsedState.json.state) {
        evolutionState = parsedState.json.state
      }
    } catch (stateErr) {
      $app
        .logger()
        .warn(
          'Evolution /instance/connectionState erro',
          'instance',
          instanceName,
          'error',
          stateErr.message || String(stateErr),
        )
    }

    // Se a instância não existe na Evolution (HTTP 404), não deve manter status 'connecting' infinito sem QR
    if (stateHttpCode === 404 && !currentQrcode && !currentConnected) {
      try {
        condo.set('whatsapp_status', 'disconnected')
        condo.set('whatsapp_connected', false)
        condo.set('whatsapp_updated_at', new Date().toISOString())
        $app.saveNoValidate(condo)
      } catch (_) {}

      return e.json(200, {
        instanceName: instanceName,
        status: 'disconnected',
        connected: false,
        phone: currentPhone,
        qrcode: '',
        evolutionState: 'not_found',
      })
    }

    // Se estiver conectado / open, tentar obter o número pelo fetchInstances
    if (evolutionState === 'open') {
      try {
        var fetchUrl =
          apiUrl + '/instance/fetchInstances?instanceName=' + encodeURIComponent(instanceName)
        var fetchRes = $http.send({
          url: fetchUrl,
          method: 'GET',
          headers: {
            apikey: apiKey,
          },
          timeout: 10,
        })
        var parsedFetch = decodeHttp(fetchRes)
        var list = Array.isArray(parsedFetch.json)
          ? parsedFetch.json
          : parsedFetch.json && parsedFetch.json.instances
            ? parsedFetch.json.instances
            : []
        if (list.length > 0) {
          var item = list[0]
          var num =
            item.number ||
            item.ownerJid ||
            (item.owner ? item.owner.replace('@s.whatsapp.net', '') : '')
          if (num) {
            detectedPhone = String(num).replace('@s.whatsapp.net', '').replace(/\D/g, '')
          }
        }
      } catch (_) {}

      // Atualizar condo como connected
      try {
        condo.set('whatsapp_instance_name', instanceName)
        condo.set('whatsapp_connected', true)
        condo.set('whatsapp_status', 'connected')
        if (detectedPhone) {
          condo.set('whatsapp_phone', detectedPhone)
        }
        condo.set('whatsapp_qrcode', '') // Limpa QR após conexão
        condo.set('whatsapp_updated_at', new Date().toISOString())
        $app.saveNoValidate(condo)
      } catch (saveErr) {
        $app
          .logger()
          .error('Falha ao salvar condo conectado', 'error', saveErr.message || String(saveErr))
      }

      return e.json(200, {
        instanceName: instanceName,
        status: 'connected',
        connected: true,
        phone: detectedPhone || currentPhone,
        qrcode: '',
      })
    }

    // Se a Evolution retornou close / refused
    if (evolutionState === 'close' || evolutionState === 'refused') {
      try {
        condo.set('whatsapp_connected', false)
        condo.set('whatsapp_status', 'disconnected')
        condo.set('whatsapp_updated_at', new Date().toISOString())
        $app.saveNoValidate(condo)
      } catch (_) {}

      return e.json(200, {
        instanceName: instanceName,
        status: 'disconnected',
        connected: false,
        phone: currentPhone,
        qrcode: '',
      })
    }

    return e.json(200, {
      instanceName: instanceName,
      status: currentStatus,
      connected: currentConnected,
      phone: currentPhone,
      qrcode: currentQrcode,
      evolutionState: evolutionState,
    })
  },
  $apis.requireAuth(),
)

// 3. DESCONECTAR (LOGOUT)
routerAdd(
  'POST',
  '/backend/v1/whatsapp/desconectar',
  (e) => {
    // Helper inline: normalizar URL
    var normalizeUrl = function (url) {
      var u = String(url || '').trim()
      if (u && !/^https?:\/\//i.test(u)) {
        u = 'https://' + u
      }
      while (u.endsWith('/')) {
        u = u.slice(0, -1)
      }
      return u
    }

    // Helper inline: decode seguro de resposta http
    var decodeHttp = function (res) {
      var rawText = ''
      try {
        if (res && res.body !== undefined && res.body !== null) {
          if (typeof res.body === 'string') {
            rawText = res.body
          } else {
            try {
              rawText = new TextDecoder().decode(res.body)
            } catch (_) {
              if (Array.isArray(res.body)) {
                rawText = String.fromCharCode.apply(null, res.body)
              } else {
                rawText = String(res.body)
              }
            }
          }
        }
      } catch (_) {
        rawText = ''
      }

      var json = null
      if (res && res.json && typeof res.json === 'object') {
        json = res.json
      } else if (rawText) {
        try {
          json = JSON.parse(rawText)
        } catch (_) {
          json = null
        }
      }

      return {
        statusCode: res ? res.statusCode : null,
        raw: rawText,
        json: json,
      }
    }

    var auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        var rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        var token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    var role = auth.getString('role')
    var body = e.requestInfo().body || {}
    var targetCondoId = auth.getString('condo_id')

    if ((role === 'master' || role === 'admin') && body.condo_id) {
      targetCondoId = body.condo_id
    }

    if (!targetCondoId) {
      return e.badRequestError('Condomínio não informado.')
    }

    var condo = null
    try {
      condo = $app.findRecordById('condos', targetCondoId)
    } catch (err) {
      return e.notFoundError('Condomínio não encontrado: ' + targetCondoId)
    }

    var rawUrl = $secrets.get('EVOLUTION_API_URL') || $os.getenv('EVOLUTION_API_URL') || ''
    var apiUrl = normalizeUrl(rawUrl)
    var apiKey = ($secrets.get('EVOLUTION_API_KEY') || $os.getenv('EVOLUTION_API_KEY') || '').trim()

    var instanceName = (condo.getString('whatsapp_instance_name') || '').trim()
    if (!instanceName) {
      instanceName = 'condo-' + targetCondoId
    }

    // Chamar DELETE /instance/logout/{instance} na Evolution (tolerante a erros)
    if (apiUrl && apiKey) {
      try {
        var logoutUrl = apiUrl + '/instance/logout/' + encodeURIComponent(instanceName)
        var logoutRes = $http.send({
          url: logoutUrl,
          method: 'DELETE',
          headers: {
            apikey: apiKey,
          },
          timeout: 10,
        })
        var parsedLogout = decodeHttp(logoutRes)
        $app
          .logger()
          .info(
            'Evolution /instance/logout resposta',
            'instance',
            instanceName,
            'status',
            parsedLogout.statusCode,
          )
      } catch (logoutErr) {
        $app
          .logger()
          .warn(
            'Evolution /instance/logout erro (ignorado)',
            'instance',
            instanceName,
            'error',
            logoutErr.message || String(logoutErr),
          )
      }
    }

    // Atualizar condo no PocketBase
    try {
      condo.set('whatsapp_connected', false)
      condo.set('whatsapp_status', 'disconnected')
      condo.set('whatsapp_qrcode', '')
      condo.set('whatsapp_updated_at', new Date().toISOString())
      $app.saveNoValidate(condo)
    } catch (saveErr) {
      return e.internalServerError('Falha ao atualizar condomínio: ' + saveErr.message)
    }

    return e.json(200, {
      success: true,
      instanceName: instanceName,
      status: 'disconnected',
      connected: false,
    })
  },
  $apis.requireAuth(),
)
