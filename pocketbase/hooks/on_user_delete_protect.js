// pocketbase/hooks/on_user_delete_protect.js
// Protege a exclusão de usuários Master e usuários protegidos do sistema

onRecordDeleteRequest((e) => {
  const record = e.record
  const role = record.getString('role')
  const email = record.getString('email')
  const auth = e.auth || (e.requestInfo && e.requestInfo().auth)

  // 1. Proteger usuário Master: nunca pode ser excluído por gestores
  if (role === 'master' || email === 'marceloslepre@gmail.com') {
    throw new BadRequestError('Não é possível excluir um usuário Master do sistema.')
  }

  // 2. Proteger contra autoexclusão no backend
  if (auth && auth.id === record.id) {
    throw new BadRequestError('Você não pode excluir a sua própria conta de usuário.')
  }

  return e.next()
}, 'users')
