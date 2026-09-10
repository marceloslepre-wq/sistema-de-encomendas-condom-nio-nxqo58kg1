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
          const nome = (plano.getString('nome') || '').trim()
          const maxMoradores = plano.getInt('max_moradores')
          const maxUnits = plano.getInt('max_units')
          const preco = Number(plano.getInt('preco_mensal') || 0)

          const isMasterVerdadeiro =
            nome === 'Plano no Master' ||
            nome === 'Plano Master' ||
            (plano.getBool('exclusivo_master') && maxMoradores <= 0 && maxUnits <= 0 && preco === 0)

          if (isMasterVerdadeiro) {
            continue // Não expira o Plano Master vitalício
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
