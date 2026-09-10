/*
  ====================================================================================================
  ROUTAS DE GESTÃO MULTI-INSTÂNCIA DO WHATSAPP (EVOLUTION API v2)
  ====================================================================================================
  Rotas registradas:
  1. POST   /backend/v1/whatsapp/conectar   - Cria ou reaproveita instância, busca QR Code e retorna ao gestor
  2. GET    /backend/v1/whatsapp/status     - Consulta connectionState na Evolution e atualiza condomínio
  3. POST   /backend/v1/whatsapp/desconectar- Executa logout da instância na Evolution
  ====================================================================================================
*/

// 1. CONECTAR
routerAdd(
  'POST',
  '/backend/v1/whatsapp/conectar',
  (e) => {
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

    var apiUrl = $secrets.get('EVOLUTION_API_URL') || ''
    if (apiUrl && apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    var apiKey = $secrets.get('EVOLUTION_API_KEY') || ''

    if (!apiUrl || !apiKey) {
      return e.internalServerError(
        'Evolution API não configurada no servidor (EVOLUTION_API_URL ou EVOLUTION_API_KEY ausente).',
      )
    }

    var instanceName = 'condo-' + targetCondoId

    // Helper interno para ler corpo http
    var decodeBody = function (res) {
      var rawText = ''
      try {
        if (res && res.body) {
          rawText = new TextDecoder().decode(res.body)
        }
      } catch (decodeErr) {
        if (res && Array.isArray(res.body)) {
          rawText = String.fromCharCode.apply(null, res.body)
        } else {
          rawText = String((res && res.body) || '')
        }
      }
      var json = null
      try {
        json = JSON.parse(rawText)
      } catch (_) {
        json = null
      }
      return { raw: rawText, json: json }
    }

    // 1. Criar a instância (idempotente: se já existir ou retornar 403, segue para connect)
    var createUrl = apiUrl + '/instance/create'
    var createPayload = {
      instanceName: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }

    var qrCodeData = ''
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

      var parsedCreate = decodeBody(createRes)
      if (parsedCreate.json) {
        if (parsedCreate.json.qrcode && parsedCreate.json.qrcode.base64) {
          qrCodeData = parsedCreate.json.qrcode.base64
        } else if (parsedCreate.json.base64) {
          qrCodeData = parsedCreate.json.base64
        }
      }
    } catch (createErr) {
      $app
        .logger()
        .warn(
          'Evolution /instance/create erro (tentando connect)',
          'error',
          createErr.message || String(createErr),
        )
    }

    // 2. Se não pegou QR Code no create, chamar /instance/connect/{instanceName}
    if (!qrCodeData) {
      try {
        var connectUrl = apiUrl + '/instance/connect/' + encodeURIComponent(instanceName)
        var connectRes = $http.send({
          url: connectUrl,
          method: 'GET',
          headers: {
            apikey: apiKey,
          },
          timeout: 15,
        })

        var parsedConnect = decodeBody(connectRes)
        if (parsedConnect.json) {
          if (parsedConnect.json.base64) {
            qrCodeData = parsedConnect.json.base64
          } else if (parsedConnect.json.qrcode && parsedConnect.json.qrcode.base64) {
            qrCodeData = parsedConnect.json.qrcode.base64
          } else if (parsedConnect.json.code) {
            qrCodeData = parsedConnect.json.code
          }
        }
      } catch (connErr) {
        $app
          .logger()
          .warn('Evolution /instance/connect erro', 'error', connErr.message || String(connErr))
      }
    }

    // 3. Atualizar o condomínio com status "connecting" e qrcode
    try {
      condo.set('whatsapp_instance_name', instanceName)
      condo.set('whatsapp_status', 'connecting')
      if (qrCodeData) {
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

    var apiUrl = $secrets.get('EVOLUTION_API_URL') || ''
    if (apiUrl && apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    var apiKey = $secrets.get('EVOLUTION_API_KEY') || ''

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

    var decodeBody = function (res) {
      var rawText = ''
      try {
        if (res && res.body) {
          rawText = new TextDecoder().decode(res.body)
        }
      } catch (decodeErr) {
        if (res && Array.isArray(res.body)) {
          rawText = String.fromCharCode.apply(null, res.body)
        } else {
          rawText = String((res && res.body) || '')
        }
      }
      var json = null
      try {
        json = JSON.parse(rawText)
      } catch (_) {
        json = null
      }
      return { raw: rawText, json: json }
    }

    var evolutionState = null
    var detectedPhone = currentPhone

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

      var parsedState = decodeBody(stateRes)
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
          'error',
          stateErr.message || String(stateErr),
        )
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
        var parsedFetch = decodeBody(fetchRes)
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

    var apiUrl = $secrets.get('EVOLUTION_API_URL') || ''
    if (apiUrl && apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    var apiKey = $secrets.get('EVOLUTION_API_KEY') || ''

    var instanceName = (condo.getString('whatsapp_instance_name') || '').trim()
    if (!instanceName) {
      instanceName = 'condo-' + targetCondoId
    }

    // Chamar DELETE /instance/logout/{instance} na Evolution (tolerante a erros)
    if (apiUrl && apiKey) {
      try {
        var logoutUrl = apiUrl + '/instance/logout/' + encodeURIComponent(instanceName)
        $http.send({
          url: logoutUrl,
          method: 'DELETE',
          headers: {
            apikey: apiKey,
          },
          timeout: 10,
        })
      } catch (logoutErr) {
        $app
          .logger()
          .warn(
            'Evolution /instance/logout erro (ignorado)',
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
