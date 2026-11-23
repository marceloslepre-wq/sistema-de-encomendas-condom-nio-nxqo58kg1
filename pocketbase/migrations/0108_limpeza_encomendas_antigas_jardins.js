// Limpeza pontual autorizada pelo usuário (Marcelo), 23/11/2026:
// exclui encomendas antigas do condo 817iv22ilheftm9 (Condomínio Residencial
// Jardins, CNPJ 13.427.770/0001-67) que:
//   - status = 'LIBERADO_RETIRADA' (nunca retiradas)
//   - data_criacao < '2026-11-23 00:00:00.000Z' (fuso do sistema; antigas de 09/11 a 17/11)
// Os históricos de historico_andamento são removidos junto (via hook
// on_recebimento_after_delete e varredura de órfãos ao final).
// Idempotente: rodar de novo não apaga nada (a condição data+status+condo já
// não casa depois da primeira execução, e nenhuma encomenda RETIRADO/ENTREGUE
// ou de outro condo é tocada).
migrate(
  (app) => {
    const CONDO = '817iv22ilheftm9'
    const CUTOFF = '2026-11-23 00:00:00.000Z'
    const TARGET = 'LIBERADO_RETIRADA'

    // 1. Coleta os alvos
    const alvos = app.findRecordsByFilter(
      'recebimentos_auditoria',
      `condo_id='${CONDO}' && status='${TARGET}' && data_criacao < '${CUTOFF}'`,
      'data_criacao',
      1000,
      0,
    )
    console.log(`[0108 limpeza Jardins] encomendas-alvo: ${alvos.length}`)

    if (alvos.length === 0) {
      console.log('[0108 limpeza Jardins] nada a excluir (já limpo ou nunca houve alvo) — no-op.')
      return
    }

    // Guarda de segurança: a exclusão é autorizada apenas para a carga conhecida
    // (~50 encomendas antigas de 09–17/11). Se o filtro casar muito além disso
    // (ex.: depois de um erro de fuso), aborta sem tocar em nada.
    if (alvos.length > 500) {
      throw new Error(
        `[0108 limpeza Jardins] guard: ${alvos.length} registros casam (esperado ~50). Abortando sem exclusão.`,
      )
    }

    // 2. Exclui os históricos vinculados ANTES das encomendas
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
            console.log(`[0108 limpeza Jardins] falha ao apagar histórico ${h.id}: ${err}`)
          }
        }
      } catch (_) {}
    }

    // 3. Exclui as encomendas (o hook on_recebimento_after_delete roda na rota
    // HTTP, não aqui; por isso a limpeza acima é feita explicitamente)
    let encomendasRemovidas = 0
    for (const rec of alvos) {
      try {
        app.delete(rec)
        encomendasRemovidas++
      } catch (err) {
        console.log(`[0108 limpeza Jardins] falha ao apagar encomenda ${rec.id}: ${err}`)
      }
    }

    // 4. Varredura final de órfãos: qualquer historico_andamento do condo que
    // aponte para encomenda inexistente
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
            console.log(`[0108 limpeza Jardins] falha ao apagar órfão ${h.id}: ${err}`)
          }
        }
      }
    } catch (_) {}

    console.log(
      `[0108 limpeza Jardins] concluído: ${encomendasRemovidas} encomendas, ${histRemovidos + orfaosRemovidos} históricos removidos (${histRemovidos} vinculados + ${orfaosRemovidos} órfãos).`,
    )
  },
  (app) => {
    // down: sem reversão — exclusão de dados autorizada é irreversível
    console.log('[0108 limpeza Jardins] down: no-op (exclusão de dados é irreversível).')
  },
)
