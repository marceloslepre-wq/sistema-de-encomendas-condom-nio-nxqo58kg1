// Endpoint seguro para consultar o status da licença do usuário autenticado (ou marcar como expirada se vencida)
routerAdd(
  'GET',
  '/backend/v1/licenca/status',
  (e) => {
    let auth = e.auth || e.requestInfo().auth || e.requestInfo().authRecord
    if (!auth) {
      try {
        const rawAuth =
          (e.request && e.request.header ? e.request.header.get('Authorization') : '') ||
          (e.requestInfo && e.requestInfo().headers
            ? e.requestInfo().headers['authorization'] || e.requestInfo().headers['Authorization']
            : '') ||
          ''
        const token = rawAuth.replace(/^Bearer\s+/i, '').trim()
        if (token) {
          auth = $app.findAuthRecordByToken(token, 'auth')
        }
      } catch (tokenErr) {
        $app
          .logger()
          .error(
            'licenca/status findAuthRecordByToken error:',
            'error',
            tokenErr.message || tokenErr,
          )
      }
    }

    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const role = auth.getString('role')
    if (role === 'master' || role === 'admin') {
      return e.json(200, {
        bloqueado: false,
        status: 'ativa',
        role: role,
        master: true,
        data_expiracao: null,
        dias_restantes: 9999,
      })
    }

    const condoId = auth.getString('condo_id')
    if (!condoId) {
      return e.json(200, {
        bloqueado: false,
        status: 'ativa',
        role: role,
        sem_condo: true,
      })
    }

    try {
      const licencas = $app.findRecordsByFilter(
        'licencas',
        `condo_id = '${condoId}'`,
        '-created',
        1,
      )

      if (licencas.length === 0) {
        return e.json(200, {
          bloqueado: false,
          status: 'ativa',
          role: role,
          observacao: 'Nenhuma licença encontrada.',
        })
      }

      const lic = licencas[0]
      let status = lic.getString('status')
      const expStr = lic.getString('data_expiracao')
      const now = new Date()

      let isExpiradaPorData = false
      let diasRestantes = null

      if (expStr) {
        const expDate = new Date(expStr)
        const diffMs = expDate.getTime() - now.getTime()
        diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (diffMs <= 0) {
          isExpiradaPorData = true
          if (status === 'ativa') {
            // Atualiza no banco para 'expirada'
            lic.set('status', 'expirada')
            try {
              $app.saveNoValidate(lic)
            } catch (_) {}
            status = 'expirada'
          }
        }
      }

      // Se o plano vinculado for "Plano no Master" ou exclusivo_master, nunca expira nem bloqueia
      let isPlanoMaster = false
      const planoIdCheck = lic.getString('plano_id')
      if (planoIdCheck) {
        try {
          const pCheck = $app.findRecordById('planos', planoIdCheck)
          if (
            pCheck.getBool('exclusivo_master') ||
            pCheck.getString('nome') === 'Plano no Master'
          ) {
            isPlanoMaster = true
          }
        } catch (_) {}
      }

      if (isPlanoMaster) {
        isExpiradaPorData = false
        diasRestantes = null
        status = 'ativa'
      }

      const bloqueado =
        !isPlanoMaster &&
        (status === 'expirada' ||
          status === 'pausada' ||
          status === 'cancelada' ||
          isExpiradaPorData)

      // Buscar dados do plano para caso precise de renovação
      let planoData = null
      const planoId = lic.getString('plano_id')
      const overrideMaxUsuarios = lic.getInt('override_max_usuarios') || null
      const overrideMaxUnidades = lic.getInt('override_max_unidades') || null

      if (planoId) {
        try {
          const plano = $app.findRecordById('planos', planoId)
          const baseMoradores = plano.getInt('max_moradores')
          const baseUnits = plano.getInt('max_units')

          planoData = {
            id: plano.id,
            nome: plano.getString('nome'),
            preco_mensal: plano.getInt('preco_mensal'),
            descricao: plano.getString('descricao'),
            exclusivo_master: plano.getBool('exclusivo_master'),
            max_moradores:
              overrideMaxUsuarios && overrideMaxUsuarios > 0 ? overrideMaxUsuarios : baseMoradores,
            max_units:
              overrideMaxUnidades && overrideMaxUnidades > 0 ? overrideMaxUnidades : baseUnits,
            base_max_moradores: baseMoradores,
            base_max_units: baseUnits,
            recursos_liberados: plano.get('recursos_liberados'),
          }
        } catch (_) {}
      }

      // Buscar condomínio
      let condoName = ''
      try {
        const condo = $app.findRecordById('condos', condoId)
        condoName = condo.getString('name')
      } catch (_) {}

      return e.json(200, {
        bloqueado: bloqueado,
        status: status,
        data_expiracao: isPlanoMaster ? null : expStr,
        dias_restantes: isPlanoMaster ? null : diasRestantes,
        sem_expiracao: isPlanoMaster || !expStr,
        licenca_id: lic.id,
        condo_id: condoId,
        condo_name: condoName,
        override_max_usuarios: overrideMaxUsuarios,
        override_max_unidades: overrideMaxUnidades,
        plano: planoData,
        role: role,
      })
    } catch (err) {
      return e.badRequestError('Erro ao consultar licença: ' + (err.message || err))
    }
  },
  $apis.requireAuth(),
)
