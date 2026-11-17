/**
 * Comparação da busca por unidade/morador usada nas telas de Retirada e Triagem.
 *
 * - Ignora maiúsculas, acentos, espaços e pontuação.
 * - Cada palavra digitada precisa aparecer em algum campo (busca por termos).
 * - Reconhece a letra da torre colada ao número do apartamento, em qualquer ordem,
 *   com ou sem espaço: "B703", "703B", "B 703" (ex.: "TORRE B (ACACIA)-703").
 */

const semAcento = (val: string | null | undefined): string =>
  (val || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

// Mantém somente letras e números: "TORRE B (ACACIA)-703" -> "torrebacacia703"
const chaveBusca = (val: string | null | undefined): string =>
  semAcento(val).replace(/[^a-z0-9]/g, '')

// Gera as formas compactas "letra+número" e "número+letra" de uma unidade.
// Ex.: "TORRE B (ACACIA)-703" -> ["b703", "703b"]
export const codigosTorreApto = (texto: string | null | undefined): string[] => {
  const t = semAcento(texto)
  const torre = t.match(/\btorre\s+([a-z])\b/)
  const apto = t.match(/(\d+)\D*$/)
  if (!torre || !apto) return []
  return [`${torre[1]}${apto[1]}`, `${apto[1]}${torre[1]}`]
}

/**
 * Verdadeiro quando TODAS as palavras da busca aparecem em algum dos campos
 * (ou nas formas compactas letra+número da unidade). Busca vazia casa tudo.
 */
export const correspondeBusca = (
  busca: string,
  campos: Array<string | null | undefined>,
): boolean => {
  const termos = busca
    .trim()
    .split(/\s+/)
    .map((t) => chaveBusca(t))
    .filter(Boolean)
  if (termos.length === 0) return true

  const alvos = [...campos.map((c) => chaveBusca(c)), ...campos.flatMap((c) => codigosTorreApto(c))]
  // Consulta inteira sem espaços ("B 703" -> "b703") casa a forma compacta da unidade
  const consultaCompacta = chaveBusca(busca)
  if (alvos.some((alvo) => alvo.includes(consultaCompacta))) return true

  return termos.every((termo) => alvos.some((alvo) => alvo.includes(termo)))
}
