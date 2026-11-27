/**
 * Guardas de volume para o registro de encomendas.
 * - LIMITE_CONFIRMACAO: acima disso, o registro pede confirmação explícita.
 * - MIN_INTERVALO_REGISTROS_MS: intervalo mínimo entre gravações sucessivas (trava anti-rajada).
 */

/** Acima deste total de volumes, o registro pede confirmação antes de gravar. */
export const LIMITE_CONFIRMACAO_VOLUME = 20

/** Intervalo mínimo (ms) entre registros sucessivos do mesmo usuário. */
export const MIN_INTERVALO_REGISTROS_MS = 8000

/**
 * Escreve um número inteiro por extenso em português (pt-BR).
 * Suporta até trilhões; números fracionários são arredondados.
 * Ex.: 2404 -> "dois mil, quatrocentos e quatro".
 */
const UNIDADES = [
  'zero',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
]
const DEZENAS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
]
const CENTENAS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
]

const grupoPorExtenso = (n: number): string => {
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (c > 0) partes.push(CENTENAS[c])
  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto])
    } else {
      const d = Math.floor(resto / 10)
      const u = resto % 10
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d])
    }
  }
  return partes.join(' e ')
}

const ESCALA = [
  { singular: 'trilhão', plural: 'trilhões' },
  { singular: 'bilhão', plural: 'bilhões' },
  { singular: 'milhão', plural: 'milhões' },
  { singular: 'mil', plural: 'mil' },
]

export const numeroPorExtenso = (valor: number): string => {
  const n = Math.round(Math.abs(Number(valor) || 0))
  if (n === 0) return 'zero'
  if (n < 1000) return grupoPorExtenso(n)

  const grupos: number[] = []
  let resto = n
  while (resto > 0) {
    grupos.unshift(resto % 1000)
    resto = Math.floor(resto / 1000)
  }

  // Alinha os grupos com a escala (os últimos mil correspondem à escala "mil")
  const offset = ESCALA.length - (grupos.length - 1)

  const partes: string[] = []
  grupos.forEach((g, i) => {
    if (g === 0) return
    const escala = ESCALA[offset + i]
    if (i === grupos.length - 1) {
      // Último grupo: sempre liga com "e" se for < 100 ou múltiplo exato de 100
      partes.push(g < 100 || g % 100 === 0 ? `e ${grupoPorExtenso(g)}` : grupoPorExtenso(g))
    } else if (escala.singular === 'mil') {
      partes.push(g === 1 ? 'mil' : `${grupoPorExtenso(g)} mil`)
    } else {
      partes.push(`${grupoPorExtenso(g)} ${g === 1 ? escala.singular : escala.plural}`)
    }
  })

  return partes.join(' ')
}

/** Formata o número com separador de milhar pt-BR (2404 -> "2.404"). */
export const formatarMilhar = (n: number): string => n.toLocaleString('pt-BR')

/**
 * Mensagem de confirmação para volumes acima do limite.
 * Ex.: "Você confirma o registro de 2.404 volumes (dois mil, quatrocentos e quatro)?"
 */
export const mensagemConfirmacaoVolume = (total: number): string =>
  `Você confirma o registro de ${formatarMilhar(total)} volumes (${numeroPorExtenso(
    total,
  )})? Essa quantidade será criada como encomendas separadas na fila da Triagem.`
