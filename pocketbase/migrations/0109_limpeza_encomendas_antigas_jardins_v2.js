// Limpeza pontual AUTORIZADA pelo usuário (Marcelo), 23/11/2026 — v2 (0108 casou
// 0 registros na base real; esta versão executa a mesma limpeza com verificação
// completa antes/depois).
//
// Exclui do condo 817iv22ilheftm9 (Condomínio Residencial Jardins,
// CNPJ 13.427.770/0001-67) SOMENTE encomendas que atendam à condição TRIPLA:
//   1. condo_id = 817iv22ilheftm9 (Jardins)
//   2. status = 'LIBERADO_RETIRADA' (nunca retiradas)
//   3. data_criacao < '2026-11-23 00:00:00.000Z' (antigas de ~09/11 a 17/11)
//
// PRESERVADO (nada disso é tocado):
//   - encomendas retiradas (ENTREGUE / RETIRADO) — histórico do gestor e morador
//   - TODAS as encomendas criadas em 23/11/2026 ou depois (inclui Aprovação Manual)
//   - registros de qualquer outro condomínio/licença
//   - moradores, usuários, notificações, logs (sholver_sync_logs) etc.
//
// ÓRFÃOS: registros de historico_andamento (Histórico de Validações) que
// referenciam encomendas excluídas são removidos junto.
//
// Idempotente: em base vazia/cópia o filtro casa 0 registros e a migração é
// no-op; rodada duas vezes na mesma base, nada mais casa.
migrate(
  (app) => {
    const CONDO = '817iv22ilheftm9'
    const CUTOFF = '2026-11-23 00:00:00.000Z'
    const TARGET = 'LIBERADO_RETIRADA'
    const TAG = '[0109 limpeza Jardins]'

    const filtroAlvo = `condo_id='${CONDO}' && status='${TARGET}' && data_criacao < '${CUTOFF}'`

    // ---- Contagens ANTES -------------------------------------------------
    // (countRecords só aceita um filtro simples; contagens compostas via SQL)
    const countSQL = (sql, params) => {
      try {
        const rows = app
          .db()
          .newQuery(sql)
          .bind(params || {})
          .all()
        return rows.length > 0 ? Number(rows[0].total) : 0
      } catch (_) {
        return 0
      }
    }
    const hojeAntes = countSQL(
      'SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id = {:c} AND data_criacao >= {:d}',
      { c: CONDO, d: CUTOFF },
    )
    const outrosAntes = countSQL(
      'SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id != {:c}',
      { c: CONDO },
    )
    const retiradasAntes = countSQL(
      'SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id = {:c} AND status != {:s}',
      { c: CONDO, s: TARGET },
    )

    // ---- Lista os alvos ---------------------------------------------------
    let alvos = []
    try {
      alvos = app.findRecordsByFilter('recebimentos_auditoria', filtroAlvo, 'data_criacao', 1000, 0)
    } catch (_) {
      alvos = [] // coleção ainda não existe (base vazia) — no-op
    }

    console.log(
      `${TAG} CONTAGEM ANTES: alvos a excluir = ${alvos.length}; encomendas Jardins de hoje (>= cutoff) = ${hojeAntes}; encomendas Jardins retiradas/sem status-alvo = ${retiradasAntes}; encomendas de OUTROS condomínios = ${outrosAntes}`,
    )

    if (alvos.length === 0) {
      console.log(`${TAG} nada a excluir (base vazia ou já limpa) — no-op.`)
      return
    }

    // Guarda de segurança: a exclusão foi autorizada para a carga conhecida
    // (~50 encomendas antigas de 09–17/11). Se casar muito além disso
    // (ex.: erro de fuso/cutoff), aborta sem tocar em nada.
    if (alvos.length > 500) {
      throw new Error(
        `${TAG} guard: ${alvos.length} registros casam (esperado ~50). Abortando sem exclusão.`,
      )
    }

    // ---- 1. Histórico de Validações vinculado às alvas -------------------
    let histRemovidos = 0
    for (const rec of alvos) {
      try {
        const hists = app.findRecordsByFilter(
          'historico_andamento',
          `recebimento_id='${rec.id}'`,
          '',
          1000,
          0,
        )
        for (const h of hists) {
          try {
            app.delete(h)
            histRemovidos++
          } catch (err) {
            console.log(`${TAG} falha ao apagar histórico ${h.id}: ${err}`)
          }
        }
      } catch (_) {}
    }

    // ---- 2. Exclui as encomendas alvo ------------------------------------
    let encomendasRemovidas = 0
    const falhas = []
    for (const rec of alvos) {
      try {
        app.delete(rec)
        encomendasRemovidas++
      } catch (err) {
        falhas.push(rec.id)
        console.log(`${TAG} falha ao apagar encomenda ${rec.id}: ${err}`)
      }
    }

    // ---- 3. Varredura de órfãos do Histórico de Validações ---------------
    // Só dentro do condomínio Jardins (as excluídas são todas dele) e somente
    // registros cujo recebimento_id não resolve mais.
    let orfaosRemovidos = 0
    try {
      const todosHist = app.findRecordsByFilter(
        'historico_andamento',
        `condo_id='${CONDO}'`,
        '',
        10000,
        0,
      )
      for (const h of todosHist) {
        try {
          app.findRecordById('recebimentos_auditoria', h.get('recebimento_id'))
        } catch (_) {
          try {
            app.delete(h)
            orfaosRemovidos++
          } catch (err) {
            console.log(`${TAG} falha ao apagar órfão ${h.id}: ${err}`)
          }
        }
      }
    } catch (_) {}

    // ---- Contagens DEPOIS -------------------------------------------------
    const hojeDepois = countSQL(
      'SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id = {:c} AND data_criacao >= {:d}',
      { c: CONDO, d: CUTOFF },
    )
    const outrosDepois = countSQL(
      'SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id != {:c}',
      { c: CONDO },
    )
    const restantesJardins = countSQL(
      'SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id = {:c}',
      { c: CONDO },
    )

    // Por status dos Jardins restantes
    let porStatus = []
    try {
      porStatus = app
        .db()
        .newQuery(
          'SELECT status, COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id = {:c} GROUP BY status ORDER BY total DESC',
        )
        .bind({ c: CONDO })
        .all()
    } catch (_) {}

    console.log(
      `${TAG} VERIFICAÇÃO APÓS: encomendas removidas = ${encomendasRemovidas} (falhas: ${falhas.length}); históricos vinculados removidos = ${histRemovidos}; órfãos removidos = ${orfaosRemovidos}`,
    )
    console.log(
      `${TAG} (a) Jardins restantes por status: ${JSON.stringify(porStatus)} (total ${restantesJardins})`,
    )
    console.log(
      `${TAG} (b) Jardins criadas >= 2026-11-23: antes ${hojeAntes} / depois ${hojeDepois} — ${hojeAntes === hojeDepois ? 'OK, nenhuma de hoje foi apagada' : 'DIFERENÇA DETECTADA!'}`,
    )
    console.log(
      `${TAG} (c) Encomendas de outros condomínios: antes ${outrosAntes} / depois ${outrosDepois} — ${outrosAntes === outrosDepois ? 'OK, inalteradas' : 'DIFERENÇA DETECTADA!'}`,
    )
    console.log(`${TAG} (d) Total de validações órfãs removidas = ${orfaosRemovidos}`)

    if (hojeDepois !== hojeAntes || outrosDepois !== outrosAntes) {
      throw new Error(
        `${TAG} pós-verificação falhou (hoje: ${hojeAntes}->${hojeDepois}; outros: ${outrosAntes}->${outrosDepois}). Investigar antes de prosseguir.`,
      )
    }
  },
  (app) => {
    console.log('[0109 limpeza Jardins] down: no-op (exclusão de dados autorizada é irreversível).')
  },
)
