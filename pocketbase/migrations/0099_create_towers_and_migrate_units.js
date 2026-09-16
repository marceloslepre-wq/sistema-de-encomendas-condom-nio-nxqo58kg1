migrate(
  (app) => {
    const condosCol = app.findCollectionByNameOrId('condos')
    const condoCollectionId = condosCol.id

    // 1. Criar coleção 'towers'
    let towersCol
    try {
      towersCol = app.findCollectionByNameOrId('towers')
    } catch (_) {
      towersCol = new Collection({
        name: 'towers',
        type: 'base',
        listRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)",
        viewRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)",
        createRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && @request.auth.condo_id != '')",
        updateRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && condo_id = @request.auth.condo_id)",
        deleteRule:
          "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && condo_id = @request.auth.condo_id)",
        fields: [
          {
            name: 'condo_id',
            type: 'relation',
            collectionId: condoCollectionId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'identifier', type: 'text', required: true },
          { name: 'nickname', type: 'text' },
          { name: 'display_name', type: 'text', required: true },
          { name: 'normalized_identifier', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_towers_condo_norm_ident ON towers (condo_id, normalized_identifier)',
        ],
      })
      app.save(towersCol)
    }

    // 2. Adicionar campo 'tower_id' na coleção 'units'
    const unitsCol = app.findCollectionByNameOrId('units')
    if (!unitsCol.fields.getByName('tower_id')) {
      unitsCol.fields.add(
        new RelationField({
          name: 'tower_id',
          collectionId: towersCol.id,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(unitsCol)
    }

    // 3. Migração automática dos dados existentes
    // Helpers internos de normalização (mesma lógica conservadora da fase 1)
    const normalizeTower = (val) => {
      if (!val) return ''
      return val
        .toString()
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
    }

    const extractTowerBase = (normalizedTower) => {
      const stripped = normalizedTower.replace(/\s*\([^)]*\)\s*$/, '').trim()
      return stripped || normalizedTower
    }

    // Parse de identifier e nickname a partir de um display name / original tower
    const parseTowerNames = (rawName) => {
      const trimmed = (rawName || '').toString().trim().replace(/\s+/g, ' ')
      const match = trimmed.match(/^(.*?)\s*\((.*?)\)\s*$/)
      if (match) {
        return {
          identifier: match[1].trim(),
          nickname: match[2].trim(),
          displayName: trimmed,
        }
      }
      return {
        identifier: trimmed,
        nickname: '',
        displayName: trimmed,
      }
    }

    // Buscar todos os condomínios
    const allCondos = app.findRecordsByFilter('condos', '1=1', 'created', 1000, 0)

    for (const condo of allCondos) {
      const condoId = condo.id
      const condoUnits = app.findRecordsByFilter(
        'units',
        'condo_id = {:condoId}',
        'created',
        10000,
        0,
        { condoId: condoId },
      )

      if (!condoUnits || condoUnits.length === 0) continue

      // Extrair todas as torres usadas neste condomínio
      const rawTowers = condoUnits
        .map((u) => u.getString('tower'))
        .map((t) => (t || '').trim())
        .filter(Boolean)

      if (rawTowers.length === 0) continue

      // Contagem de frequência de cada forma original
      const counts = {}
      for (const t of rawTowers) {
        counts[t] = (counts[t] || 0) + 1
      }
      const uniqueOriginals = Object.keys(counts)

      const normMap = {}
      const allNormalized = {}
      for (const orig of uniqueOriginals) {
        const norm = normalizeTower(orig)
        normMap[orig] = norm
        allNormalized[norm] = true
      }

      // Bases puras existentes
      const standaloneBases = {}
      for (const norm of Object.keys(allNormalized)) {
        const base = extractTowerBase(norm)
        if (base === norm) {
          standaloneBases[base] = true
        }
      }

      // Agrupamento de torres por chave
      // Regra conservadora: só funde se standaloneBase existir
      const groups = {}
      for (const orig of uniqueOriginals) {
        const norm = normMap[orig]
        const base = extractTowerBase(norm)
        const groupKey = standaloneBases[base] ? base : norm

        if (!groups[groupKey]) {
          groups[groupKey] = {
            groupKey: groupKey,
            normalizedVariants: {},
            originalVariants: [],
          }
        }
        groups[groupKey].normalizedVariants[norm] = true
        groups[groupKey].originalVariants.push(orig)
      }

      // Para cada grupo, determinar o melhor display_name, identifier, nickname
      // e criar o registro em 'towers' se ainda não existir
      const groupToTowerRecordId = {}

      for (const groupKey of Object.keys(groups)) {
        const g = groups[groupKey]
        let bestOriginal = g.originalVariants[0]
        let maxCount = -1

        const exactMatch = g.originalVariants.find((orig) => normMap[orig] === g.groupKey)
        if (exactMatch) {
          bestOriginal = exactMatch
        } else {
          for (const orig of g.originalVariants) {
            const c = counts[orig] || 0
            if (c > maxCount) {
              maxCount = c
              bestOriginal = orig
            }
          }
        }

        const parsed = parseTowerNames(bestOriginal)
        const normIdent = normalizeTower(parsed.identifier)

        // Verificar se torre já existe pelo condo_id + normalized_identifier
        let towerRecord
        try {
          const existing = app.findRecordsByFilter(
            'towers',
            'condo_id = {:condoId} && normalized_identifier = {:normIdent}',
            '',
            1,
            0,
            { condoId: condoId, normIdent: normIdent },
          )
          if (existing.length > 0) {
            towerRecord = existing[0]
          }
        } catch (_) {}

        if (!towerRecord) {
          towerRecord = new Record(towersCol)
          towerRecord.set('condo_id', condoId)
          towerRecord.set('identifier', parsed.identifier)
          towerRecord.set('nickname', parsed.nickname)
          towerRecord.set('display_name', parsed.displayName)
          towerRecord.set('normalized_identifier', normIdent)
          app.save(towerRecord)
        }

        groupToTowerRecordId[groupKey] = {
          id: towerRecord.id,
          displayName: towerRecord.getString('display_name') || parsed.displayName,
        }
      }

      // Vincular cada unit do condomínio ao seu tower_id correspondente
      // e garantir que unit.tower esteja consistente com display_name
      for (const u of condoUnits) {
        const currentTower = (u.getString('tower') || '').trim()
        const currentNorm = normalizeTower(currentTower)
        const currentBase = extractTowerBase(currentNorm)
        const groupKey = standaloneBases[currentBase] ? currentBase : currentNorm

        const target = groupToTowerRecordId[groupKey]
        if (target) {
          const updates = {}
          let changed = false
          if (u.getString('tower_id') !== target.id) {
            updates.tower_id = target.id
            changed = true
          }
          if (u.getString('tower') !== target.displayName) {
            updates.tower = target.displayName
            changed = true
          }
          if (changed) {
            u.set('tower_id', target.id)
            u.set('tower', target.displayName)
            app.save(u)
          }
        }
      }
    }
  },
  (app) => {
    try {
      const unitsCol = app.findCollectionByNameOrId('units')
      if (unitsCol.fields.getByName('tower_id')) {
        unitsCol.fields.removeByName('tower_id')
        app.save(unitsCol)
      }
    } catch (_) {}

    try {
      const towersCol = app.findCollectionByNameOrId('towers')
      app.delete(towersCol)
    } catch (_) {}
  },
)
