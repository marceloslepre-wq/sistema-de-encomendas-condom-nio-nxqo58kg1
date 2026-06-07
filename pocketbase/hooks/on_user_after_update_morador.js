onRecordAfterUpdateSuccess((e) => {
  if (e.record.getString('role') !== 'morador') return e.next()

  const moradores = $app.findCollectionByNameOrId('moradores')

  let record
  try {
    record = $app.findFirstRecordByData('moradores', 'email', e.record.getString('email'))
  } catch (_) {
    try {
      record = $app.findFirstRecordByData('moradores', 'cpf', e.record.getString('cpf'))
    } catch (_) {
      record = new Record(moradores)
    }
  }

  record.set('nome', e.record.getString('name'))
  record.set('email', e.record.getString('email'))
  record.set('telefone', e.record.getString('phone'))
  record.set('cpf', e.record.getString('cpf'))
  record.set('torre', e.record.getString('torre'))
  record.set('apartamento', e.record.getString('unidade'))

  $app.save(record)
  return e.next()
}, 'users')
