routerAdd('POST', '/backend/v1/password-recovery', (e) => {
  const body = e.requestInfo().body
  const email = body.email

  if (!email) return e.badRequestError('E-mail é obrigatório')

  try {
    const user = $app.findAuthRecordByEmail('users', email)
    const newPassword = $security.randomString(8)

    // Set and save the provisional password
    user.setPassword(newPassword)
    $app.save(user)

    try {
      const message = new MailerMessage({
        from: {
          address: $app.settings().meta.senderAddress || 'noreply@condominio.com',
          name: $app.settings().meta.senderName || 'Condomínio',
        },
        to: [{ address: user.email() }],
        subject: 'Recuperação de Senha - Senha Provisória',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Recuperação de Senha</h2>
            <p>Olá,</p>
            <p>Sua senha provisória foi gerada com sucesso. Utilize a senha abaixo para acessar o sistema:</p>
            <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
              <strong style="font-size: 24px; letter-spacing: 2px;">${newPassword}</strong>
            </div>
            <p><strong>Atenção:</strong> Por motivos de segurança, altere sua senha imediatamente após realizar o login, acessando a seção "Meus Dados".</p>
            <p>Atenciosamente,<br>Equipe do Condomínio</p>
          </div>
        `,
      })
      $app.newMailClient().send(message)
    } catch (mailErr) {
      $app.logger().error('Failed to send password recovery email', 'error', mailErr.message)
    }

    return e.json(200, { success: true })
  } catch (err) {
    // Always return success to prevent email enumeration attacks
    return e.json(200, { success: true })
  }
})
