/**
 * Utilitários para normalização e matching flexível de Torres e Unidades/Apartamentos
 * entre registros de Unidades cadastradas (units) e Usuários com papel morador (users).
 *
 * Exemplo real de inconsistência:
 * - Unidade cadastrada na tabela units: tower: "Torre A", apartment: "101"
 * - Morador cadastrado na tabela users: torre: "A", unidade: "101"
 * Ou variações com espaços, case, prefixo "bloco", "apto", etc.
 */

/**
 * Remove espaços, caracteres especiais irrelevantes e converte para minúsculas.
 */
export const normalizeText = (val: string | null | undefined): string => {
  return (val || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '')
}

/**
 * Normaliza especificamente o nome de uma torre / bloco (conforme especificação da Fase 1):
 * Trim, colapso de múltiplos espaços, remoção de acentos e uppercase.
 * Ex: "  Torre   A (Amarílis)  " -> "TORRE A (AMARILIS)"
 *     "torre b " -> "TORRE B"
 */
export const normalizeTower = (val: string | null | undefined): string => {
  if (!val) return ''
  return val
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

/**
 * Normalização canonical/simplificada de torre para comparação flexível antiga:
 * Remove prefixos torre/bloco e minúsculas sem espaços.
 */
export const normalizeTowerStrict = (val: string | null | undefined): string => {
  let str = normalizeText(val)
  str = str.replace(/^(torre|bloco|edificio|ed)-?/i, '')
  str = str.replace(/^0+/, '')
  return str
}

/**
 * Normaliza especificamente o número do apartamento / unidade:
 * Ex: "101" -> "101"
 *     "Apto 101" -> "101"
 *     "0101" -> "101"
 */
export const normalizeApartment = (val: string | null | undefined): string => {
  let str = normalizeText(val)
  str = str.replace(/^(apto|apartamento|unidade|unid|sala|casa)-?/i, '')
  str = str.replace(/^0+/, '')
  return str
}

/**
 * Verifica se a torre informada na unidade bate com a torre do morador.
 */
export const isTowerMatch = (
  unitTower: string | null | undefined,
  moradorTorre: string | null | undefined,
): boolean => {
  // Se bate com o matching deduplicado
  if (towerMatches(unitTower, moradorTorre)) return true

  const normUnit = normalizeTowerStrict(unitTower)
  const normMorador = normalizeTowerStrict(moradorTorre)

  // Se ambos vazios ou exatamente iguais
  if (normUnit === normMorador && normUnit !== '') return true

  // Verificação de string direta normalizada
  const rawUnit = normalizeText(unitTower)
  const rawMorador = normalizeText(moradorTorre)
  if (rawUnit === rawMorador && rawUnit !== '') return true

  // Se uma contém a outra e o tamanho for significativo
  if (
    normUnit &&
    normMorador &&
    (normUnit === normMorador || rawUnit.includes(normMorador) || rawMorador.includes(rawUnit))
  ) {
    return true
  }

  return false
}

/**
 * Verifica se o apartamento/unidade informado na unidade bate com a unidade do morador.
 */
export const isApartmentMatch = (
  unitApartment: string | null | undefined,
  moradorUnidade: string | null | undefined,
): boolean => {
  const normUnit = normalizeApartment(unitApartment)
  const normMorador = normalizeApartment(moradorUnidade)

  if (normUnit === normMorador) return true

  const rawUnit = normalizeText(unitApartment)
  const rawMorador = normalizeText(moradorUnidade)
  if (rawUnit === rawMorador) return true

  return false
}

/**
 * Verifica se um morador pertence à unidade especificada por tower e apartment.
 */
export const isResidentInUnit = (
  morador: { torre?: string; unidade?: string },
  unit: { tower?: string; apartment?: string },
): boolean => {
  if (!unit || !morador) return false
  return (
    isTowerMatch(unit.tower, morador.torre) && isApartmentMatch(unit.apartment, morador.unidade)
  )
}

/**
 * Comparador numérico/natural crescente para identificadores de unidade/apartamento.
 * Ordena numericamentecaso haja número:
 * Ex: 101 < 102 < 103 < 201 < 1002 < 1304 < 1601 < 2004.
 * Caso tenha sufixos (ex: 101-A vs 101-B), compara o número principal primeiro e depois a string.
 */
export const compareUnitNumbers = (a?: string | null, b?: string | null): number => {
  const strA = (a || '').toString().trim()
  const strB = (b || '').toString().trim()

  if (!strA && !strB) return 0
  if (!strA) return 1
  if (!strB) return -1

  return strA.localeCompare(strB, 'pt-BR', { numeric: true, sensitivity: 'base' })
}

/**
 * Ordena um array de strings de unidades/apartamentos em ordem crescente.
 */
export const sortUnitStrings = (list: string[]): string[] => {
  return [...list].sort(compareUnitNumbers)
}

/**
 * Extrai a forma base de uma torre caso ela tenha parênteses ou apelido.
 * Ex: "TORRE A (AMARILIS)" -> "TORRE A"
 *     "BLOCO 1 (SUL)" -> "BLOCO 1"
 *     "TORRE A" -> "TORRE A"
 */
export const extractTowerBase = (normalizedTower: string): string => {
  // Remove parênteses e seu conteúdo no final da string
  const stripped = normalizedTower.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return stripped || normalizedTower
}

export interface DedupeTowerGroup {
  displayName: string
  normalizedBase: string
  variants: string[] // strings normalizadas pertencentes ao grupo
  originalVariants: string[] // grafias originais recebidas
}

/**
 * Deduplica torres seguindo a regra conservadora da Fase 1:
 * - Grupo "TORRE X (QUALQUER COISA)" só é fundido com grupo "TORRE X" se "TORRE X" existir separadamente
 *   no conjunto de torres do condomínio.
 * - Caso contrário ("TORRE A (ORQUIDEA)" sem existir "TORRE A" pura), permanece como torre própria independente!
 * - Nome exibido: preferir a forma mais comum/original usada nas unidades (ex.: "Torre A" ou a grafia original do grupo base).
 * - Ordenação: ordem alfanumérica natural pt-BR.
 */
export const dedupeTowers = (towerNames: (string | null | undefined)[]): string[] => {
  const valid = towerNames.map((t) => (t || '').toString().trim()).filter(Boolean)

  if (valid.length === 0) return []

  // Contagem de ocorrências originais para escolher a forma preferida de exibição
  const counts = new Map<string, number>()
  for (const name of valid) {
    counts.set(name, (counts.get(name) || 0) + 1)
  }

  // Lista única de nomes originais
  const uniqueOriginals = Array.from(new Set(valid))

  // Mapear cada nome original para sua versão normalizada
  const normMap = new Map<string, string>() // original -> normalized
  const allNormalized = new Set<string>()
  for (const orig of uniqueOriginals) {
    const norm = normalizeTower(orig)
    normMap.set(orig, norm)
    allNormalized.add(norm)
  }

  // Conjunto de bases existentes como entradas independentes exatas
  // Uma entrada é "base pura" se ela não tem parênteses ou é igual à sua base
  const standaloneBases = new Set<string>()
  for (const norm of allNormalized) {
    const base = extractTowerBase(norm)
    if (base === norm) {
      standaloneBases.add(base)
    }
  }

  // Agrupamento
  // Chave do grupo: se a base extraída existir em standaloneBases, agrupa na base; caso contrário, chave é o próprio norm
  const groups = new Map<
    string,
    {
      groupKey: string
      normalizedVariants: Set<string>
      originalVariants: string[]
    }
  >()

  for (const orig of uniqueOriginals) {
    const norm = normMap.get(orig)!
    const base = extractTowerBase(norm)

    // Regra: só funde "TORRE X (QUALQUER COISA)" com "TORRE X" se "TORRE X" existir separadamente
    const groupKey = standaloneBases.has(base) ? base : norm

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        normalizedVariants: new Set<string>(),
        originalVariants: [],
      })
    }

    const g = groups.get(groupKey)!
    g.normalizedVariants.add(norm)
    g.originalVariants.push(orig)
  }

  // Escolhe o displayName para cada grupo:
  // Se o grupo foi fundido na base e existe um original cuja forma normalizada é exatamente a base,
  // prefere aquele original (ou com maior contagem). Caso contrário, pega o original com maior frequência.
  const result: string[] = []

  for (const g of groups.values()) {
    // Escolhe a melhor representação original
    let bestOriginal = g.originalVariants[0]
    let maxCount = -1

    // Se temos uma variante que bate com o groupKey exato, dá prioridade a ela
    const exactMatch = g.originalVariants.find((orig) => normMap.get(orig) === g.groupKey)

    if (exactMatch) {
      bestOriginal = exactMatch
    } else {
      for (const orig of g.originalVariants) {
        const c = counts.get(orig) || 0
        if (c > maxCount) {
          maxCount = c
          bestOriginal = orig
        }
      }
    }

    result.push(bestOriginal)
  }

  // Ordenação alfanumérica natural
  return result.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }))
}

/**
 * Verifica se a unidade pertence à torre selecionada no filtro ou formulário.
 * Regras:
 * - Se ambos normalizam exatamente iguais: match!
 * - Se `selectedTower` é uma base (ex: "Torre A" -> "TORRE A") e `unitTower` é uma variação com parênteses
 *   (ex: "Torre A (Amarilis)" -> "TORRE A (AMARILIS)"), bate!
 * - Caso `unitTower` seja base e `selectedTower` tenha variação, também bate se o base for idêntico.
 * - Caso não haja parenteses em nenhum e forem diferentes, não bate.
 */
export const towerMatches = (
  selectedTower: string | null | undefined,
  unitTower: string | null | undefined,
): boolean => {
  const normSelected = normalizeTower(selectedTower)
  const normUnit = normalizeTower(unitTower)

  if (!normSelected || !normUnit) return false
  if (normSelected === normUnit) return true

  // Comparações de base com parênteses
  const baseSelected = extractTowerBase(normSelected)
  const baseUnit = extractTowerBase(normUnit)

  // Se uma é a base pura e a outra é base + apelido
  if (baseSelected === baseUnit) {
    return true
  }

  // Fallback para case-insensitive trim
  return normSelected === normUnit
}
