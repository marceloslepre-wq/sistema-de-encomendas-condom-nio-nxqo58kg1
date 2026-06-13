routerAdd(
  'GET',
  '/backend/v1/admin/users',
  (e) => {
    const auth = e.auth
    if (!auth || (auth.getString('role') !== 'gestor' && auth.getString('role') !== 'admin')) {
      throw new ForbiddenError('Acesso negado. Apenas gestores podem realizar esta ação.')
    }

    const result = $app.findRecordsByFilter('users', '1=1', '-created', 1000, 0)

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
