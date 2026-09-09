// pocketbase/hooks/verificar_limites_plano.js
// Valida limites de moradores e unidades no BACKEND antes de permitir novos cadastros
// Apenas NOVOS cadastros são bloqueados se atingirem o limite do plano contratado.
// Se o plano for "Plano no Master", ilimitado (max_moradores <= 0 ou max_units <= 0) ou exclusivo_master, nenhum limite se aplica.

// 1. Validar limite de Moradores antes da criação na collection 'moradores'
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
      const planoId = licencas[0].getString('plano_id')
      if (planoId) {
        plano = $app.findRecordById('planos', planoId)
      }
    }
  } catch (_) {}

  if (!plano) {
    return e.next()
  }

  // Se for exclusivo master ou chamado "Plano no Master", sem limites
  if (plano.getBool('exclusivo_master') || plano.getString('nome') === 'Plano no Master') {
    return e.next()
  }

  const maxMoradores = plano.getInt('max_moradores')
  // Se max_moradores for 0 ou menor, significa ilimitado
  if (maxMoradores <= 0) {
    return e.next()
  }

  // Contar moradores existentes do condomínio
  const currentCount = $app.countRecords('moradores', `condo_id = '${condoId}'`)
  if (currentCount >= maxMoradores) {
    throw new BadRequestError(
      `Limite do plano atingido (${maxMoradores} moradores). Faça upgrade do plano para continuar cadastrando.`,
    )
  }

  return e.next()
}, 'moradores')

// 2. Validar limite de Moradores caso seja criado diretamente via 'users' com role 'morador'
onRecordCreate((e) => {
  const record = e.record
  const role = record.getString('role')
  if (role !== 'morador') {
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
      const planoId = licencas[0].getString('plano_id')
      if (planoId) {
        plano = $app.findRecordById('planos', planoId)
      }
    }
  } catch (_) {}

  if (!plano) {
    return e.next()
  }

  if (plano.getBool('exclusivo_master') || plano.getString('nome') === 'Plano no Master') {
    return e.next()
  }

  const maxMoradores = plano.getInt('max_moradores')
  if (maxMoradores <= 0) {
    return e.next()
  }

  // Contar usuários moradores ativos do condomínio
  const currentCount = $app.countRecords('users', `condo_id = '${condoId}' && role = 'morador'`)
  if (currentCount >= maxMoradores) {
    throw new BadRequestError(
      `Limite do plano atingido (${maxMoradores} moradores). Faça upgrade do plano para continuar cadastrando.`,
    )
  }

  return e.next()
}, 'users')

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
      const planoId = licencas[0].getString('plano_id')
      if (planoId) {
        plano = $app.findRecordById('planos', planoId)
      }
    }
  } catch (_) {}

  if (!plano) {
    return e.next()
  }

  if (plano.getBool('exclusivo_master') || plano.getString('nome') === 'Plano no Master') {
    return e.next()
  }

  const maxUnits = plano.getInt('max_units')
  if (maxUnits <= 0) {
    return e.next()
  }

  const currentCount = $app.countRecords('units', `condo_id = '${condoId}'`)
  if (currentCount >= maxUnits) {
    throw new BadRequestError(
      `Limite do plano atingido (${maxUnits} unidades). Faça upgrade do plano para continuar cadastrando.`,
    )
  }

  return e.next()
}, 'units')
