migrate(
  (app) => {
    const emptyCondoId = 'j6ofxo1v937yizu'
    const mainCondoId = 'cjvbjhk0senz1yt'

    // 1. Verificar se o registro duplicado existe
    let targetCondo
    try {
      targetCondo = app.findRecordById('condos', emptyCondoId)
    } catch (_) {
      console.log('Condomínio duplicado já não existe:', emptyCondoId)
      return
    }

    // Salvaguarda: garantir que não é o condomínio principal
    if (targetCondo.id === mainCondoId) {
      console.log('Abortando: tentativa de excluir condomínio principal')
      return
    }

    // 2. Excluir unidades vinculadas a esse condomínio de teste se houver
    try {
      const units = app.findRecordsByFilter('units', `condo_id = '${emptyCondoId}'`, '', 1000, 0)
      for (const u of units) {
        app.delete(u)
      }
    } catch (e) {
      console.log('Erro ao limpar unidades de teste:', e)
    }

    // 3. Excluir torres vinculadas a esse condomínio de teste se houver
    try {
      const towers = app.findRecordsByFilter('towers', `condo_id = '${emptyCondoId}'`, '', 1000, 0)
      for (const t of towers) {
        app.delete(t)
      }
    } catch (e) {
      console.log('Erro ao limpar torres de teste:', e)
    }

    // 4. Limpar eventuais outros registros órfãos nas demais coleções por precaução
    const collectionsToCheck = [
      'recebimentos_auditoria',
      'moradores',
      'carriers',
      'templates_notificacao',
      'notificacoes_enviadas',
      'volume_types',
      'shelf_locations',
      'historico_andamento',
      'whatsapp_verifications',
      'whatsapp_logs',
      'invitation_links',
      'entregadores',
      'licencas',
      'pagamentos_renovacao',
      'historico_licencas',
    ]

    for (const colName of collectionsToCheck) {
      try {
        const records = app.findRecordsByFilter(
          colName,
          `condo_id = '${emptyCondoId}'`,
          '',
          1000,
          0,
        )
        for (const r of records) {
          app.delete(r)
        }
      } catch (err) {
        console.log(`Erro ao verificar/limpar ${colName}:`, err)
      }
    }

    // 5. Excluir o condomínio duplicado vazio
    app.delete(targetCondo)
    console.log(`Condomínio duplicado ${emptyCondoId} excluído com sucesso!`)
  },
  (app) => {
    // Reverter exclusão de teste não é necessário
  },
)
