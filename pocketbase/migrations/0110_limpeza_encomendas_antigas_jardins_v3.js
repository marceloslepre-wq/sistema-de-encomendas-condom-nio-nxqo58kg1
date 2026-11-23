// Limpeza pontual AUTORIZADA pelo usuário (Marcelo), 23/11/2026 — v3 (0108/0109
// apagaram as LIBERADO_RETIRADA antigas; esta remove o restante da fila antiga:
// "Aprovação Manual" e "Em Triagem" de 09–14/11, incluindo o batch GLEISTONE/Shopee).
//
// Exclui do condo 817iv22ilheftm9 (Condomínio Residencial Jardins,
// CNPJ 13.427.770/0001-67) SOMENTE encomendas que atendam à condição TRIPLA:
//   1. condo_id = 817iv22ilheftm9 (Jardins)
//   2. data_criacao < '2026-11-23 00:00:00.000Z' (antigas de ~09/11 a 17/11)
//   3. status NÃO finalizado — ou seja, QUALQUER status pendente
//      (Aprovação Manual, EM_TRIAGEM, LIBERADO_RETIRADA, ...), exceto
//      ENTREGUE / RETIRADO (histórico de retiradas).
//      O usuário confirmou: essas antigas já foram entregues aos moradores
//      FORA do sistema e não estão mais fisicamente disponíveis.
//
// PRESERVADO (nada disso é tocado):
//   - encomendas com status ENTREGUE / RETIRADO (histórico do gestor e morador)
//   - TODAS as encomendas criadas em 23/11/2026 ou depois (guarda principal)
//   - registros de qualquer outro condomínio/licença (cjvbjhk0senz1yt etc.)
//   - moradores, usuários, notificações, logs (sholver_sync_logs) etc.
//
// ÓRFÃOS: registros de historico_andamento (Histórico de Validações) que
// referenciam encomendas excluídas são removidos junto (mesmo padrão da 0109).
//
// Idempotente: em base vazia/cópia o filtro casa 0 registros e a migração é
// no-op; rodada duas vezes na mesma base, nada mais casa.
migrate(
  (app) => {
    const CONDO = '817iv22ilheftm9'
    const CUTOFF = '2026-11-23 00:00:00.000Z'
    const TAG = '[0110 limpeza Jardins v3]'
    // Status finalizados que NUNCA são apagados (comparação em maiúsculas,
    // porque a coleção usa texto livre: já existem 'Aprovação Manual',
    // 'EM_TRIAGEM', 'LIBERADO_RETIRADA' etc.).
    const FINALIZADOS = ['ENTREGUE', 'RETIRADO']

    const filtroJardinsAntigas = `condo_id='${CONDO}' && data_criacao < '${CUTOFF}'`

    // ---- Contagens ANTES -------------------------------------------------
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
      "SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id = {:c} AND data_criacao < {:d} AND UPPER(status) IN ('ENTREGUE','RETIRADO')",
      { c: CONDO, d: CUTOFF },
    )

    // ---- Candidatas: TODAS as antigas dos Jardins; o recorte de status é
    // feito em JS (texto livre + acentuação => mais seguro fora do filtro).
    let candidatas = []
    try {
      candidatas = app.findRecordsByFilter(
        'recebimentos_auditoria',
        filtroJardinsAntigas,
        'data_criacao',
        1000,
        0,
      )
    } catch (_) {
      candidatas = [] // coleção ainda não existe (base vazia) — no-op
    }

    // Recorte: exclui apenas as NÃO finalizadas (histórico ENTREGUE/RETIRADO
    // fica de fora, assim como qualquer variante em outra capitalização).
    const alvos = candidatas.filter((rec) => {
      const st = String(rec.get('status') || '').toUpperCase()
      return FINALIZADOS.indexOf(st) === -1
    })

    // Tally por status (para o log de auditoria)
    const porStatusAlvos = {}
    for (const rec of alvos) {
      const st = String(rec.get('status') || '(vazio)')
      porStatusAlvos[st] = (porStatusAlvos[st] || 0) + 1
    }
    const porStatusPreservadas = {}
    for (const rec of candidatas) {
      const st = String(rec.get('status') || '(vazio)')
      if (alvos.indexOf(rec) === -1) {
        porStatusPreservadas[st] = (porStatusPreservadas[st] || 0) + 1
      }
    }

    console.log(
      `${TAG} CONTAGEM ANTES: alvos a excluir = ${alvos.length} (${JSON.stringify(porStatusAlvos)}); antigas ENTREGUE/RETIRADO preservadas = ${retiradasAntes} (${JSON.stringify(porStatusPreservadas)}); encomendas Jardins de hoje (>= cutoff) = ${hojeAntes}; encomendas de OUTROS condomínios = ${outrosAntes}`,
    )

    if (alvos.length === 0) {
      console.log(`${TAG} nada a excluir (base vazia ou já limpa) — no-op.`)
      return
    }

    // Guarda de segurança: a exclusão foi autorizada para a carga conhecida
    // (~40 encomendas pendentes antigas de 09–14/11). Se casar muito além
    // disso (ex.: erro de fuso/cutoff), aborta sem tocar em nada.
    if (alvos.length > 300) {
      throw new Error(
        `${TAG} guard: ${alvos.length} registros casam (esperado ~40). Abortando sem exclusão.`,
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
    const retiradasDepois = countSQL(
      "SELECT COUNT(*) AS total FROM recebimentos_auditoria WHERE condo_id = {:c} AND data_criacao < {:d} AND UPPER(status) IN ('ENTREGUE','RETIRADO')",
      { c: CONDO, d: CUTOFF },
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
      `${TAG} (c) Jardins antigas ENTREGUE/RETIRADO (histórico): antes ${retiradasAntes} / depois ${retiradasDepois} — ${retiradasAntes === retiradasDepois ? 'OK, histórico intacto' : 'DIFERENÇA DETECTADA!'}`,
    )
    console.log(
      `${TAG} (d) Encomendas de outros condomínios: antes ${outrosAntes} / depois ${outrosDepois} — ${outrosAntes === outrosDepois ? 'OK, inalteradas' : 'DIFERENÇA DETECTADA!'}`,
    )
    console.log(`${TAG} (e) Total de validações órfãs removidas = ${orfaosRemovidos}`)

    if (
      hojeDepois !== hojeAntes ||
      outrosDepois !== outrosAntes ||
      retiradasDepois !== retiradasAntes
    ) {
      throw new Error(
        `${TAG} pós-verificação falhou (hoje: ${hojeAntes}->${hojeDepois}; histórico: ${retiradasAntes}->${retiradasDepois}; outros: ${outrosAntes}->${outrosDepois}). Investigar antes de prosseguir.`,
      )
    }
  },
  (app) => {
    console.log(
      '[0110 limpeza Jardins v3] down: no-op (exclusão de dados autorizada é irreversível).',
    )
  },
)
