/*
  Limpeza pontual dos dados de TESTE do condomínio Jardins (v0 dashboard KPIs):
  remove EXATAMENTE os dois registros de 28/10/2026 que o usuário confirmou ser
  somente teste (morador Fabricio Nunes Fraga, Torre D 1504, MAGALU, status ENTREGUE).

  Idempotente: se os registros não existirem (ou já tiverem sido removidos), não faz nada.
  Não é uma migration — roda uma única vez no boot após o deploy e não toca em mais nada.
*/

onBootstrap((e) => {
  e.next()

  const ids = ['zxyk4qa8ekludrw', 'h1erid27z4hjyrz']
  let removed = 0

  ids.forEach((id) => {
    try {
      const rec = $app.findRecordById('recebimentos_auditoria', id)
      // Defesa extra: só apaga se ainda estiver com os dados esperados do teste
      if (rec.getString('status') === 'ENTREGUE' && rec.getString('transportadora') === 'MAGALU') {
        $app.delete(rec)
        removed++
        console.log('[dashboard-cleanup] registro de teste removido:', id)
      } else {
        console.log(
          '[dashboard-cleanup] registro',
          id,
          'não corresponde ao teste esperado — não removido',
        )
      }
    } catch (_) {
      // Registro não existe — nada a fazer (idempotente)
    }
  })

  console.log('[dashboard-cleanup] concluído — registros removidos:', removed)
})
