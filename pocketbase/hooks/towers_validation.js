// pocketbase/hooks/towers_validation.js
// Hook de validação anti-duplicidade e auto-formatação para a coleção 'towers'
// e sincronização de units ao alterar display_name de uma torre

// 1. Ao criar torre
onRecordCreateRequest((e) => {
  const normalize = (val) => {
    if (!val) return ''
    return val
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
  }

  const record = e.record
  const condoId = record.getString('condo_id')
  const identifier = record.getString('identifier').trim().replace(/\s+/g, ' ')
  const nickname = record.getString('nickname').trim().replace(/\s+/g, ' ')

  if (!identifier) {
    throw new BadRequestError('O identificador da torre ou bloco é obrigatório.')
  }

  // Gera display_name se não preenchido ou mantém sincronizado
  let displayName = record.getString('display_name').trim()
  if (!displayName) {
    displayName = nickname ? `${identifier} (${nickname})` : identifier
  }

  const normIdent = normalize(identifier)
  record.set('identifier', identifier)
  record.set('nickname', nickname)
  record.set('display_name', displayName)
  record.set('normalized_identifier', normIdent)

  // Validação anti-duplicidade: mesmo condo_id + normalized_identifier
  if (condoId) {
    const existing = $app.findRecordsByFilter(
      'towers',
      'condo_id = {:condoId} && normalized_identifier = {:normIdent}',
      '',
      1,
      0,
      { condoId: condoId, normIdent: normIdent },
    )
    if (existing.length > 0) {
      throw new BadRequestError(
        `Já existe uma torre cadastrada com o identificador "${identifier}" neste condomínio.`,
      )
    }
  }

  return e.next()
}, 'towers')

// 2. Ao atualizar torre
onRecordUpdateRequest((e) => {
  const normalize = (val) => {
    if (!val) return ''
    return val
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
  }

  const record = e.record
  const condoId = record.getString('condo_id')
  const identifier = record.getString('identifier').trim().replace(/\s+/g, ' ')
  const nickname = record.getString('nickname').trim().replace(/\s+/g, ' ')

  if (!identifier) {
    throw new BadRequestError('O identificador da torre ou bloco é obrigatório.')
  }

  let displayName = record.getString('display_name').trim()
  if (!displayName) {
    displayName = nickname ? `${identifier} (${nickname})` : identifier
  }

  const normIdent = normalize(identifier)
  record.set('identifier', identifier)
  record.set('nickname', nickname)
  record.set('display_name', displayName)
  record.set('normalized_identifier', normIdent)

  if (condoId) {
    const existing = $app.findRecordsByFilter(
      'towers',
      'condo_id = {:condoId} && normalized_identifier = {:normIdent} && id != {:id}',
      '',
      1,
      0,
      { condoId: condoId, normIdent: normIdent, id: record.id },
    )
    if (existing.length > 0) {
      throw new BadRequestError(
        `Já existe outra torre cadastrada com o identificador "${identifier}" neste condomínio.`,
      )
    }
  }

  return e.next()
}, 'towers')

// 3. Ao salvar atualização da torre: sincronizar o campo de texto 'tower' das units vinculadas
onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const newDisplayName = record.getString('display_name')
  const towerId = record.id

  try {
    const linkedUnits = $app.findRecordsByFilter('units', 'tower_id = {:towerId}', '', 10000, 0, {
      towerId: towerId,
    })
    for (const u of linkedUnits) {
      if (u.getString('tower') !== newDisplayName) {
        u.set('tower', newDisplayName)
        $app.save(u)
      }
    }
  } catch (err) {
    console.log('Erro ao sincronizar nome da torre nas units:', err)
  }

  return e.next()
}, 'towers')

// 4. Ao tentar excluir torre: impedir se houver unidades vinculadas
onRecordDeleteRequest((e) => {
  const record = e.record
  const towerId = record.id

  const count = $app.countRecords('units', $dbx.hashExp({ tower_id: towerId }))
  if (count > 0) {
    throw new BadRequestError(
      `Não é possível excluir esta torre porque ela possui ${count} unidade(s) vinculada(s). Remova ou altere as unidades primeiro.`,
    )
  }

  return e.next()
}, 'towers')
