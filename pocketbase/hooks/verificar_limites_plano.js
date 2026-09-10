// pocketbase/hooks/verificar_limites_plano.js
// Valida limites de USUÁRIOS e UNIDADES no BACKEND antes de permitir novos cadastros
// Apenas NOVOS cadastros são bloqueados se atingirem o limite do plano contratado.
// A contagem de usuários engloba TODOS os perfis vinculados ao condomínio (morador, porteiro, portaria, triagem, gestor).
// Se o plano for o "Plano Master" ilimitado (max_moradores <= 0 ou max_units <= 0), nenhum limite se aplica.
// O flag 'exclusivo_master' sozinho NÃO torna o plano ilimitado.

// 1. Validar limite de Usuários antes da criação na collection 'users' (todos os perfis: morador, porteiro, portaria, triagem, gestor)
onRecordCreate((e) => {
  const record = e.record
  const role = record.getString('role')

  // Usuários com papel master ou admin global não contam no limite do condomínio
  if (role === 'master' || role === 'admin') {
    return e.next()
  }

  const auth = e.requestInfo().auth
  if (auth && (auth.getString('role') === 'master' || auth.getString('role') === 'admin')) {
    return e.next()
  }

  let condoId = record.getString('condo_id')
  if (!condoId && auth) {
    condoId = auth.getString('condo_id')
  }

  if (!condoId) {
    return e.next()
  }

  let licenca = null
  let plano = null
  try {
    const licencas = $app.findRecordsByFilter(
      'licencas',
      `condo_id = '${condoId}'`,
      '-created',
      1,
      0,
    )
    if (licencas && licencas.length > 0) {
      licenca = licencas[0]
      const planoId = licenca.getString('plano_id')
      if (planoId) {
        plano = $app.findRecordById('planos', planoId)
      }
    }
  } catch (_) {}

  if (!plano) {
    return e.next()
  }

  const pNome = (plano.getString('nome') || '').trim()
  const pMaxMoradores = plano.getInt('max_moradores')
  const pMaxUnits = plano.getInt('max_units')
  const pPreco = Number(plano.getInt('preco_mensal') || 0)
  const isMasterIlimitado =
    pNome === 'Plano no Master' ||
    pNome === 'Plano Master' ||
    (plano.getBool('exclusivo_master') && pMaxMoradores <= 0 && pMaxUnits <= 0 && pPreco === 0)

  if (isMasterIlimitado) {
    return e.next()
  }

  // Verifica se a licença possui override específico de limite de usuários (> 0)
  let maxUsuarios = 0
  const overrideUsuarios = licenca ? licenca.getInt('override_max_usuarios') : 0
  if (overrideUsuarios > 0) {
    maxUsuarios = overrideUsuarios
  } else {
    maxUsuarios = plano.getInt('max_moradores')
  }

  // Se maxUsuarios for 0 ou menor, significa ilimitado
  if (maxUsuarios <= 0) {
    return e.next()
  }

  // Contar TODOS os usuários existentes do condomínio (independentemente do perfil)
  const currentCount = $app.countRecords('users', `condo_id = '${condoId}'`)
  if (currentCount >= maxUsuarios) {
    const errorMsg = `Limite do plano atingido (${maxUsuarios} usuários). Faça upgrade do plano para continuar cadastrando.`
    throw new BadRequestError(errorMsg, {
      plan_limit: new ValidationError('plan_limit_reached', errorMsg),
    })
  }

  return e.next()
}, 'users')

// 2. Validar limite antes da criação na collection 'moradores' (caso ocorra cadastro direto ou fluxo legado)
onRecordCreate((e) => {
  const record = e.record
  const auth = e.requestInfo().auth

  // Se for superuser / master / admin, não bloqueia
  if (auth && (auth.getString('role') === 'master' || auth.getString('role') === 'admin')) {
    return e.next()
  }

  let condoId = record.getString('condo_id')
  if (!condoId && auth) {
    condoId = auth.getString('condo_id')
  }

  if (!condoId) {
    return e.next()
  }

  // Buscar licença ativa do condomínio
  let licenca = null
  let plano = null
  try {
    const licencas = $app.findRecordsByFilter(
      'licencas',
      `condo_id = '${condoId}'`,
      '-created',
      1,
      0,
    )
    if (licencas && licencas.length > 0) {
      licenca = licencas[0]
      const planoId = licenca.getString('plano_id')
      if (planoId) {
        plano = $app.findRecordById('planos', planoId)
      }
    }
  } catch (_) {}

  if (!plano) {
    return e.next()
  }

  const pNomeMor = (plano.getString('nome') || '').trim()
  const pMaxMoradoresMor = plano.getInt('max_moradores')
  const pMaxUnitsMor = plano.getInt('max_units')
  const pPrecoMor = Number(plano.getInt('preco_mensal') || 0)
  const isMasterIlimitadoMor =
    pNomeMor === 'Plano no Master' ||
    pNomeMor === 'Plano Master' ||
    (plano.getBool('exclusivo_master') &&
      pMaxMoradoresMor <= 0 &&
      pMaxUnitsMor <= 0 &&
      pPrecoMor === 0)

  if (isMasterIlimitadoMor) {
    return e.next()
  }

  let maxUsuarios = 0
  const overrideUsuarios = licenca ? licenca.getInt('override_max_usuarios') : 0
  if (overrideUsuarios > 0) {
    maxUsuarios = overrideUsuarios
  } else {
    maxUsuarios = plano.getInt('max_moradores')
  }

  if (maxUsuarios <= 0) {
    return e.next()
  }

  // A contagem dinâmica considera o total de usuários cadastrados no condomínio
  const currentCount = $app.countRecords('users', `condo_id = '${condoId}'`)
  if (currentCount >= maxUsuarios) {
    const errorMsg = `Limite do plano atingido (${maxUsuarios} usuários). Faça upgrade do plano para continuar cadastrando.`
    throw new BadRequestError(errorMsg, {
      plan_limit: new ValidationError('plan_limit_reached', errorMsg),
    })
  }

  return e.next()
}, 'moradores')

// 3. Validar limite de Unidades antes da criação na collection 'units'
onRecordCreate((e) => {
  const record = e.record
  const auth = e.requestInfo().auth

  if (auth && (auth.getString('role') === 'master' || auth.getString('role') === 'admin')) {
    return e.next()
  }

  let condoId = record.getString('condo_id')
  if (!condoId && auth) {
    condoId = auth.getString('condo_id')
  }

  if (!condoId) {
    return e.next()
  }

  let licenca = null
  let plano = null
  try {
    const licencas = $app.findRecordsByFilter(
      'licencas',
      `condo_id = '${condoId}'`,
      '-created',
      1,
      0,
    )
    if (licencas && licencas.length > 0) {
      licenca = licencas[0]
      const planoId = licenca.getString('plano_id')
      if (planoId) {
        plano = $app.findRecordById('planos', planoId)
      }
    }
  } catch (_) {}

  if (!plano) {
    return e.next()
  }

  const pNomeUnit = (plano.getString('nome') || '').trim()
  const pMaxMoradoresUnit = plano.getInt('max_moradores')
  const pMaxUnitsUnit = plano.getInt('max_units')
  const pPrecoUnit = Number(plano.getInt('preco_mensal') || 0)
  const isMasterIlimitadoUnit =
    pNomeUnit === 'Plano no Master' ||
    pNomeUnit === 'Plano Master' ||
    (plano.getBool('exclusivo_master') &&
      pMaxMoradoresUnit <= 0 &&
      pMaxUnitsUnit <= 0 &&
      pPrecoUnit === 0)

  if (isMasterIlimitadoUnit) {
    return e.next()
  }

  let maxUnits = 0
  const overrideUnits = licenca ? licenca.getInt('override_max_unidades') : 0
  if (overrideUnits > 0) {
    maxUnits = overrideUnits
  } else {
    maxUnits = plano.getInt('max_units')
  }

  if (maxUnits <= 0) {
    return e.next()
  }

  const currentCount = $app.countRecords('units', `condo_id = '${condoId}'`)
  if (currentCount >= maxUnits) {
    const errorMsg = `Limite do plano atingido (${maxUnits} unidades). Faça upgrade do plano para continuar cadastrando.`
    throw new BadRequestError(errorMsg, {
      plan_limit: new ValidationError('plan_limit_reached', errorMsg),
    })
  }

  return e.next()
}, 'units')
