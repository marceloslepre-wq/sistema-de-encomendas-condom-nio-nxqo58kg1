// Endpoint para gestor trocar de plano do condomínio (upgrade ou downgrade)
// Sem restrição de valor/porte — liberado para qualquer plano ativo que não seja exclusivo_master
// Mantém número/id da licença e data de expiração atuais
// Registra o evento na coleção historico_licencas
routerAdd('POST', '/backend/v1/licenca/trocar-plano', (e) => {
  const auth = e.requestInfo().authRecord
  if (!auth) {
    return e.forbiddenError('Não autenticado.')
  }

  const role = auth.getString('role')
  if (role !== 'gestor' && role !== 'master' && role !== 'admin') {
    return e.forbiddenError('Apenas gestores ou administradores podem alterar o plano.')
  }

  const condoId = auth.getString('condo_id')
  if (!condoId) {
    return e.badRequestError('Nenhum condomínio vinculado a esta conta.')
  }

  const body = e.requestInfo().body || {}
  const novoPlanoId = body.plano_id
  if (!novoPlanoId) {
    return e.badRequestError('O ID do novo plano é obrigatório.')
  }

  // Buscar novo plano
  let novoPlano = null
  try {
    novoPlano = $app.findRecordById('planos', novoPlanoId)
  } catch (_) {
    return e.notFoundError('Plano selecionado não encontrado.')
  }

  if (novoPlano.getString('status') !== 'ativo') {
    return e.badRequestError('O plano selecionado não está ativo.')
  }

  // Não permitir que clientes selecionem plano exclusivo master
  if (role !== 'master' && role !== 'admin') {
    if (
      novoPlano.getBool('exclusivo_master') ||
      novoPlano.getString('nome') === 'Plano no Master'
    ) {
      return e.forbiddenError('Este plano é de uso exclusivo da administração master.')
    }
  }

  // Buscar licença atual do condomínio
  const licencas = $app.findRecordsByFilter('licencas', `condo_id = '${condoId}'`, '-created', 1, 0)

  if (!licencas || licencas.length === 0) {
    return e.notFoundError('Licença do condomínio não encontrada.')
  }

  const lic = licencas[0]
  const planoAntigoId = lic.getString('plano_id')
  let planoAntigoNome = 'Plano Anterior'
  if (planoAntigoId) {
    try {
      const pAntigo = $app.findRecordById('planos', planoAntigoId)
      planoAntigoNome = pAntigo.getString('nome')
    } catch (_) {}
  }

  const novoPlanoNome = novoPlano.getString('nome')

  // Atualizar a licença apontando para o novo plano mantendo id e data_expiracao
  lic.set('plano_id', novoPlano.id)
  $app.save(lic)

  // Registrar a mudança no histórico de licenças
  try {
    const histCol = $app.findCollectionByNameOrId('historico_licencas')
    const hist = new Record(histCol)
    hist.set('condo_id', condoId)
    hist.set('licenca_id', lic.id)
    hist.set('plano_id', novoPlano.id)
    hist.set('tipo_evento', 'troca_plano')
    hist.set('plano_nome', novoPlanoNome)
    hist.set('data_expiracao', lic.getString('data_expiracao'))
    hist.set(
      'descricao',
      `Alteração de plano realizada: de "${planoAntigoNome}" para "${novoPlanoNome}"`,
    )
    hist.set('alterado_por', auth.getString('name') || auth.getString('email') || 'Gestor')
    $app.save(hist)
  } catch (errHist) {
    $app
      .logger()
      .error('Erro ao registrar histórico de troca de plano:', 'error', errHist.message || errHist)
  }

  return e.json(200, {
    success: true,
    message: `Plano alterado com sucesso para ${novoPlanoNome}.`,
    licenca_id: lic.id,
    plano_id: novoPlano.id,
    plano_nome: novoPlanoNome,
    data_expiracao: lic.getString('data_expiracao'),
  })
})
