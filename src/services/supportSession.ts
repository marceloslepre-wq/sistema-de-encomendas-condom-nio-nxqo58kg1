import pb from '@/lib/pocketbase/client'

export const SUPPORT_CONDO_KEY = 'condpack_support_condo'

export interface SupportCondoSession {
  id: string
  name: string
}

/**
 * Retorna a sessão ativa de suporte/impersonação do Master, se houver.
 */
export function getSupportCondoSession(): SupportCondoSession | null {
  try {
    const raw = localStorage.getItem(SUPPORT_CONDO_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.id === 'string' && parsed.id.trim() !== '') {
      return {
        id: parsed.id.trim(),
        name: parsed.name || 'Condomínio em Suporte',
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Inicia a sessão de suporte do Master para um condomínio alvo.
 */
export function startSupportSession(condo: { id: string; name: string }) {
  const session: SupportCondoSession = {
    id: condo.id,
    name: condo.name,
  }
  localStorage.setItem(SUPPORT_CONDO_KEY, JSON.stringify(session))
  // Dispara evento para reatividade imediata no app
  window.dispatchEvent(new CustomEvent('condpack:support-session-changed', { detail: session }))
}

/**
 * Encerra a sessão de suporte do Master, retornando ao condomínio de origem do Master.
 */
export function endSupportSession() {
  localStorage.removeItem(SUPPORT_CONDO_KEY)
  window.dispatchEvent(new CustomEvent('condpack:support-session-changed', { detail: null }))
}

/**
 * Retorna o condo_id ativo atual do usuário:
 * 1. Se for Master com sessão de suporte ativa -> retorna o ID do condomínio alvo da sessão.
 * 2. Se for usuário comum ou Master fora do suporte -> retorna pb.authStore.record?.condo_id.
 */
export function getActiveCondoId(): string | undefined {
  const isMaster = pb.authStore.record?.role === 'master'
  if (isMaster) {
    const support = getSupportCondoSession()
    if (support?.id) {
      return support.id
    }
  }
  return pb.authStore.record?.condo_id || undefined
}

/**
 * Determina se o usuário atual está em modo suporte do Master.
 */
export function isSupportModeActive(): boolean {
  return pb.authStore.record?.role === 'master' && !!getSupportCondoSession()
}
