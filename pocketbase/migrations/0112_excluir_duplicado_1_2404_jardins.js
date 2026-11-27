/// <reference path="../pb_data/types.d.ts" />
/**
 * 0112 — Exclusão pontual do registro "1/2404" (id itny6vfraxfawmx), Condomínio Residencial Jardins (817iv22ilheftm9)
 *
 * Na limpeza anterior (0111) o 1/2404 foi PRESERVADO por parecer entrega real
 * (rastreio TBR479340404, foto, LIBERADO_RETIRADA, codigo_retirada 427755).
 * O usuário confirmou que a entrega real do morador André Milanez Milaneze é representada
 * pelos registros "1/2" (7li81y722o9cyl2) e "2/2" (ckcvr7hr0z9vcce), criados 26/11 20h53 —
 * é neles que a baixa da retirada vai acontecer. Portanto o 1/2404 é duplicado e deve ser apagado.
 *
 * Idempotente: em base vazia (ou já limpa) não encontra o alvo e não faz nada.
 * Guardas (mesmo padrão da 0111): só apaga se encontrar EXATAMENTE 1 registro com esse id,
 * pertencente ao condo 817iv22ilheftm9, com status LIBERADO_RETIRADA e volume 1/2404
 * (nunca status ENTREGUE — retirada concluída). Qualquer divergência → abortar sem apagar nada.
 * Apaga também os registros órfãos de historico_andamento vinculados (recebimento_id = itny6vfraxfawmx).
 */
migrate(
  (app) => {
    const CONDO_ID = '817iv22ilheftm9'
    const TARGET_ID = 'itny6vfraxfawmx'
    const VOLUME_ESPERADO = '1/2404'

    let alvo = null
    try {
      alvo = app.findRecordById('recebimentos_auditoria', TARGET_ID)
    } catch (e) {
      console.log('[0112] alvo itny6vfraxfawmx não existe (base vazia ou já limpa) — no-op:', e)
      return
    }

    // GUARDA 1: pertence ao condomínio Jardins
    if (alvo.getString('condo_id') !== CONDO_ID) {
      throw new Error(
        '[0112] GUARDA: registro ' +
          TARGET_ID +
          ' pertence ao condo ' +
          alvo.getString('condo_id') +
          ' (esperado ' +
          CONDO_ID +
          ') — abortando sem excluir',
      )
    }

    // GUARDA 2: volume esperado
    if (alvo.getString('volume') !== VOLUME_ESPERADO) {
      throw new Error(
        '[0112] GUARDA: registro ' +
          TARGET_ID +
          ' tem volume ' +
          alvo.getString('volume') +
          ' (esperado ' +
          VOLUME_ESPERADO +
          ') — abortando sem excluir',
      )
    }

    // GUARDA 3: nunca apagar retirada concluída (status ENTREGUE)
    const status = (alvo.getString('status') || '').trim().toUpperCase()
    if (status === 'ENTREGUE' || status === 'RETIRADO') {
      throw new Error(
        '[0112] GUARDA: registro ' +
          TARGET_ID +
          ' tem status ' +
          status +
          ' (retirada concluída) — abortando sem excluir',
      )
    }

    // GUARDA 4: status deve ser exatamente LIBERADO_RETIRADA (estado conhecido na triagem)
    if (status !== 'LIBERADO_RETIRADA') {
      throw new Error(
        '[0112] GUARDA: status do registro ' +
          TARGET_ID +
          ' mudou para ' +
          status +
          ' (esperado LIBERADO_RETIRADA) — abortando sem excluir',
      )
    }

    // GUARDA 5: exatamente 1 registro com esse id (findRecordById já garante unicidade de PK;
    // recontagem defensiva por filtro, abortando se divergir)
    const porFiltro = app.findRecordsByFilter(
      'recebimentos_auditoria',
      "id = '" + TARGET_ID + "'",
      '',
      2,
      0,
    )
    if (porFiltro.length !== 1) {
      throw new Error(
        '[0112] GUARDA: esperado EXATAMENTE 1 registro com id ' +
          TARGET_ID +
          ', encontrados ' +
          porFiltro.length +
          ' — abortando sem excluir',
      )
    }

    console.log(
      '[0112] alvo confirmado: ' +
        TARGET_ID +
        ' (volume ' +
        alvo.getString('volume') +
        ', morador ' +
        alvo.getString('morador') +
        ', status ' +
        status +
        ') — prosseguindo com a exclusão',
    )

    app.runInTransaction((tx) => {
      // apagar históricos órfãos vinculados a este recebimento
      let removidosHist = 0
      const hist = tx.findRecordsByFilter(
        'historico_andamento',
        "recebimento_id = '" + TARGET_ID + "'",
        '',
        999,
        0,
      )
      for (const h of hist) {
        tx.delete(h)
        removidosHist++
      }
      // apagar o registro duplicado
      tx.delete(alvo)
      console.log(
        '[0112] excluído 1 recebimento (' +
          TARGET_ID +
          ') e ' +
          removidosHist +
          ' históricos órfãos',
      )
    })
  },
  (app) => {
    // down: exclusão de dados é irreversível — nada a reverter
    console.log('[0112] down: no-op (exclusão de dados não é reversível)')
  },
)
