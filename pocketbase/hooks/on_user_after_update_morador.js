onRecordAfterUpdateSuccess((e) => {
  if (e.record.getString('role') !== 'morador') {
    return e.next()
  }

  try {
    const cpf = e.record.getString('cpf')
    if (!cpf) return e.next()

    let morador
    try {
      morador = $app.findFirstRecordByData('moradores', 'cpf', cpf)
    } catch (_) {
      const moradores = $app.findCollectionByNameOrId('moradores')
      morador = new Record(moradores)
    }

    morador.set('nome', e.record.getString('name'))
    morador.set('email', e.record.getString('email'))
    morador.set('cpf', cpf)
    morador.set('torre', e.record.getString('torre'))
    morador.set('apartamento', e.record.getString('unidade'))
    morador.set('telefone', e.record.getString('phone'))

    $app.save(morador)
  } catch (err) {
    $app
      .logger()
      .error(
        'Erro ao sincronizar morador após update',
        'error',
        err.message,
        'user_id',
        e.record.id,
      )
  }

  return e.next()
}, 'users')
