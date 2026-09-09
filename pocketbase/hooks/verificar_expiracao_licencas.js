// Hook para verificar e marcar licenças vencidas como 'expirada'
// Executa a cada hora para garantir que condomínios com data_expiracao ultrapassada sejam bloqueados.
cronAdd('verificar_expiracao_licencas', '0 * * * *', () => {
  try {
    const nowISO = new Date().toISOString()
    // Buscar licenças ativas cuja data de expiração já passou
    const expiredList = $app.findRecordsByFilter(
      'licencas',
      `status = 'ativa' && data_expiracao != '' && data_expiracao < '${nowISO}'`,
      '',
      500,
    )

    for (let i = 0; i < expiredList.length; i++) {
      const lic = expiredList[i]
      const planoId = lic.getString('plano_id')
      if (planoId) {
        try {
          const plano = $app.findRecordById('planos', planoId)
          if (plano.getBool('exclusivo_master') || plano.getString('nome') === 'Plano no Master') {
            continue // Não expira planos master
          }
        } catch (_) {}
      }
      lic.set('status', 'expirada')
      $app.saveNoValidate(lic)
      $app
        .logger()
        .info(
          'Licença expirada automaticamente:',
          'licencaId',
          lic.id,
          'condoId',
          lic.getString('condo_id'),
        )
    }
  } catch (err) {
    $app.logger().error('Erro ao verificar expiração de licenças:', 'error', err.message || err)
  }
})
