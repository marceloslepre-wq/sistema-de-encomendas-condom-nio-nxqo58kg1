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
 * Normaliza especificamente o nome de uma torre / bloco:
 * Ex: "Torre A" -> "a"
 *     "Torre 01" -> "1"
 *     "Bloco B" -> "b"
 *     "A" -> "a"
 */
export const normalizeTower = (val: string | null | undefined): string => {
  let str = normalizeText(val)
  // Remove prefixos comuns como 'torre', 'bloco', 'edificio', 'ed'
  str = str.replace(/^(torre|bloco|edificio|ed)-?/i, '')
  // Remove zeros à esquerda caso seja numérico
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
  const normUnit = normalizeTower(unitTower)
  const normMorador = normalizeTower(moradorTorre)

  // Se ambos vazios ou exatamente iguais
  if (normUnit === normMorador) return true

  // Verificação de string direta normalizada
  const rawUnit = normalizeText(unitTower)
  const rawMorador = normalizeText(moradorTorre)
  if (rawUnit === rawMorador) return true

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
