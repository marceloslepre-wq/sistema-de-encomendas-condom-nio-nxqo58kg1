import { useRef, useState, useCallback } from 'react'

/**
 * Trava anti-rajada para o registro de encomendas:
 * - Bloqueia cliques repetidos enquanto a gravação está em andamento (dedupe de gesto).
 * - Exige um intervalo mínimo entre registros sucessivos do mesmo usuário.
 * - Expõe `segundosRestantes` para feedback visual (contagem regressiva no botão).
 */

export const useRajadaGuard = (intervaloMs: number) => {
  const [bloqueado, setBloqueado] = useState(false)
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const ultimoRegistroRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pararTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const iniciarCooldown = useCallback(
    (ms: number) => {
      pararTimer()
      setBloqueado(true)
      setSegundosRestantes(Math.ceil(ms / 1000))
      timerRef.current = setInterval(() => {
        setSegundosRestantes((s) => {
          if (s <= 1) {
            pararTimer()
            setBloqueado(false)
            return 0
          }
          return s - 1
        })
      }, 1000)
    },
    [pararTimer],
  )

  /**
   * Tenta iniciar um registro.
   * Retorna false (sem gravar) se houver gravação em andamento ou se estiver
   * dentro do intervalo mínimo entre registros.
   */
  const tentarRegistrar = useCallback((): boolean => {
    const agora = Date.now()
    if (bloqueado) return false
    const desdeUltimo = agora - ultimoRegistroRef.current
    if (ultimoRegistroRef.current > 0 && desdeUltimo < intervaloMs) {
      iniciarCooldown(intervaloMs - desdeUltimo)
      return false
    }
    ultimoRegistroRef.current = agora
    iniciarCooldown(intervaloMs)
    return true
  }, [bloqueado, intervaloMs, iniciarCooldown])

  return { tentarRegistrar, bloqueado, segundosRestantes }
}
