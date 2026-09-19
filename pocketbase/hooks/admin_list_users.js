routerAdd(
  'GET',
  '/backend/v1/admin/users',
  (e) => {
    const auth = e.auth
    if (
      !auth ||
      (auth.getString('role') !== 'gestor' &&
        auth.getString('role') !== 'admin' &&
        auth.getString('role') !== 'master')
    ) {
      throw new ForbiddenError(
        'Acesso negado. Apenas gestores e administradores podem realizar esta ação.',
      )
    }

    const role = auth.getString('role')
    const userCondoId = auth.getString('condo_id')
    let filter = '1=1'
    if (role !== 'master' && role !== 'admin') {
      if (!userCondoId) {
        return e.json(200, [])
      }
      // Lista estritamente os usuários vinculados ao condomínio do gestor
      // Usuário master só deve aparecer se o seu condo_id for exatamente o deste condomínio
      filter = `condo_id = '${userCondoId}'`
    }

    const result = $app.findRecordsByFilter('users', filter, '-created', 1000, 0)

    const items = result.map((record) => {
      const data = record.publicExport()
      // Explicitly include email which might be hidden by default rules
      data.email = record.email()
      return data
    })

    return e.json(200, items)
  },
  $apis.requireAuth(),
)
