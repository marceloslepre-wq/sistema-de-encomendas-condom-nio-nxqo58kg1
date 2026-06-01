routerAdd(
  'POST',
  '/backend/v1/whatsapp/verify',
  (e) => {
    const body = e.requestInfo().body
    if (!body.phone || !body.code) {
      return e.badRequestError('Phone and code are required')
    }

    const phoneNum = String(body.phone || '').replace(/\D/g, '')

    const records = $app.findRecordsByFilter(
      'whatsapp_verifications',
      'phone = {:phone} && used = false',
      '-created',
      1,
      0,
      { phone: phoneNum },
    )

    if (records.length === 0) {
      return e.badRequestError('Nenhum código pendente encontrado')
    }

    const record = records[0]

    const lockedUntil = record.getString('locked_until')
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
      const remaining = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000)
      return e.badRequestError(`Bloqueado por tentativas falhas. Tente novamente em ${remaining}s`)
    }

    const expiresAtStr = record.getString('expires_at')
    if (new Date(expiresAtStr).getTime() < Date.now()) {
      return e.badRequestError('Código expirado')
    }

    if (record.getString('code') !== String(body.code)) {
      let attempts = record.getInt('attempts') + 1
      record.set('attempts', attempts)

      if (attempts >= 3) {
        record.set('locked_until', new Date(Date.now() + 5 * 60000).toISOString())
        $app.save(record)
        return e.badRequestError(
          'Código incorreto. Máximo de tentativas atingido (bloqueado por 5m).',
        )
      } else {
        $app.save(record)
        return e.badRequestError(`Código incorreto. Tentativa ${attempts}/3.`)
      }
    }

    record.set('used', true)
    $app.save(record)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
