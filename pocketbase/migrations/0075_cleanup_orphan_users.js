migrate(
  (app) => {
    const orphanUsers = []

    // Find all users with role 'morador'
    const users = app.findRecordsByFilter('users', "role='morador'", '-created', 10000, 0)

    for (const user of users) {
      const email = user.getString('email')
      const cpf = user.getString('cpf')
      const phone = user.getString('phone')

      let filterParts = []
      if (email && email.trim() !== '') {
        filterParts.push(`email='${email.replace(/'/g, "''")}'`)
      }
      if (cpf && cpf.trim() !== '') {
        filterParts.push(`cpf='${cpf.replace(/'/g, "''")}'`)
      }
      if (phone && phone.trim() !== '') {
        filterParts.push(`telefone='${phone.replace(/'/g, "''")}'`)
      }

      let isOrphan = true

      // Check if a morador with corresponding contact info exists
      if (filterParts.length > 0) {
        const filter = filterParts.join(' || ')
        try {
          const morador = app.findRecordsByFilter('moradores', filter, '-created', 1, 0)
          if (morador && morador.length > 0) {
            isOrphan = false
          }
        } catch (err) {
          // Ignored
        }
      } else {
        // If the user has no email, cpf, or phone, it's definitely an orphan
        isOrphan = true
      }

      if (isOrphan) {
        orphanUsers.push(user)
      }
    }

    // Delete the orphan users
    for (const user of orphanUsers) {
      try {
        app.delete(user)
        console.log(`Deleted orphan user: ${user.id} (${user.getString('email')})`)
      } catch (err) {
        console.log(`Failed to delete orphan user: ${user.id}`, err)
      }
    }
  },
  (app) => {
    // Revert not possible for deletions
  },
)
