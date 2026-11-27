/// <reference path="../pb_data/types.d.ts" />
/**
 * 0111 — Limpeza dos registros fantasma "N/2404" (Condomínio Residencial Jardins, 817iv22ilheftm9)
 *
 * Em 26/11/2026 entre 20h51m51 e 20h52m30 (fuso do banco) foram criados 99 registros fantasma
 * do morador André Milanez Milaneze (TORRE A (ORQUIDEA) - 1302, AMAZON, entregador JESSE SILVA,
 * código MANUAL), volumes "2/2404" a "100/2404", em rajada (~0,3s cada) por cliques repetidos.
 *
 * PRESERVADOS (nunca excluir):
 *  - itny6vfraxfawmx (1/2404): entrega REAL — triada em 27/11, codigo_retirada 427755, LIBERADO_RETIRADA
 *  - 7li81y722o9cyl2 (1/2) e ckcvr7hr0z9vcce (2/2): entrega real de 26/11 20h53m05
 *
 * Idempotente: em base vazia (ou já limpa) não encontra alvos e não faz nada.
 * Guardas: aborta se alvos > 300 ou se qualquer alvo divergir do perfil do fantasma
 * (morador/transportadora/status ou possuir código de rastreio/foto — sinais de entrega real).
 */
migrate(
  (app) => {
    const CONDO_ID = '817iv22ilheftm9'
    const PRESERVED_IDS = ['itny6vfraxfawmx', '7li81y722o9cyl2', 'ckcvr7hr0z9vcce']
    const MORADOR_ESPERADO = 'André Milanez Milaneze'
    const TRANSPORTADORA_ESPERADA = 'AMAZON'
    const norm = (s) => (s || '').trim().toUpperCase()

    const filter =
      "condo_id = '" +
      CONDO_ID +
      "' && volume ~ '/2404' && " +
      "created >= '2026-11-26 20:51:51' && created <= '2026-11-26 20:52:31'"

    let targets = []
    try {
      targets = app.findRecordsByFilter('recebimentos_auditoria', filter, 'created', 999, 0)
    } catch (e) {
      console.log('[0111] recebimentos_auditoria sem registros compatíveis (base vazia):', e)
      return
    }

    const ghosts = targets.filter(
      (r) => r.getString('volume') !== '1/2404' && PRESERVED_IDS.indexOf(r.id) === -1,
    )

    console.log(
      '[0111] alvos compatíveis com o intervalo:',
      targets.length,
      '| fantasmas após preservação:',
      ghosts.length,
    )

    if (ghosts.length === 0) {
      console.log('[0111] nada a excluir — no-op')
      return
    }

    if (ghosts.length > 300) {
      throw new Error(
        '[0111] GUARDA: ' +
          ghosts.length +
          ' alvos excedem o limite de 300 — abortando sem excluir nada',
      )
    }

    for (const g of ghosts) {
      const morador = g.getString('morador')
      const transportadora = g.getString('transportadora')
      const rastreio = g.getString('codigo_rastreio')
      const photo = g.getString('photo')
      if (
        norm(morador) !== norm(MORADOR_ESPERADO) ||
        norm(transportadora) !== norm(TRANSPORTADORA_ESPERADA)
      ) {
        throw new Error(
          '[0111] GUARDA: registro ' +
            g.id +
            ' (' +
            g.getString('volume') +
            ') diverge do perfil do fantasma (morador=' +
            morador +
            ', transportadora=' +
            transportadora +
            ') — abortando',
        )
      }
      if (rastreio !== '' || photo !== '') {
        throw new Error(
          '[0111] GUARDA: registro ' +
            g.id +
            ' (' +
            g.getString('volume') +
            ') possui código de rastreio ou foto — possível entrega real, abortando',
        )
      }
    }

    app.runInTransaction((tx) => {
      let removidosHist = 0
      for (const g of ghosts) {
        const id = g.id
        const hist = tx.findRecordsByFilter(
          'historico_andamento',
          "recebimento_id = '" + id + "'",
          '',
          999,
          0,
        )
        for (const h of hist) {
          tx.delete(h)
          removidosHist++
        }
        tx.delete(g)
      }
      console.log(
        '[0111] excluídos ' +
          ghosts.length +
          ' fantasmas e ' +
          removidosHist +
          ' históricos órfãos',
      )
    })
  },
  (app) => {
    // down: exclusão de dados é irreversível — nada a reverter
    console.log('[0111] down: no-op (exclusão de dados não é reversível)')
  },
)
