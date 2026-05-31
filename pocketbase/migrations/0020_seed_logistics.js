migrate((app) => {
  const vtCol = app.findCollectionByNameOrId('volume_types')
  const vts = ['Envelope', 'Caixa Pequena', 'Caixa Média', 'Caixa Grande', 'Outros']
  for (const v of vts) {
    try {
      app.findFirstRecordByData('volume_types', 'name', v)
    } catch (_) {
      const r = new Record(vtCol)
      r.set('name', v)
      app.save(r)
    }
  }

  const slCol = app.findCollectionByNameOrId('shelf_locations')
  const sls = [
    'Prateleira A - Nível 1',
    'Prateleira B - Nível 2',
    'Gaveta de Envelopes',
    'Chão (Grande Volume)',
  ]
  for (const s of sls) {
    try {
      app.findFirstRecordByData('shelf_locations', 'name', s)
    } catch (_) {
      const r = new Record(slCol)
      r.set('name', s)
      app.save(r)
    }
  }

  const ntCol = app.findCollectionByNameOrId('notification_templates')
  const templates = [
    {
      status: 'ENTRADA_PORTARIA',
      message:
        'Olá {name}, sua encomenda (Rastreio: {tracking}) foi Recebida na Portaria de {condoName}.',
    },
    {
      status: 'EM_TRIAGEM',
      message: 'Olá {name}, sua encomenda (Rastreio: {tracking}) está em Triagem.',
    },
    {
      status: 'LIBERADO_RETIRADA',
      message:
        'Olá {name}, sua encomenda (Rastreio: {tracking}) está Disponível para Retirada em {condoName}. Código: {code}',
    },
    {
      status: 'RETIRADO',
      message:
        'Olá {name}, sua encomenda (Rastreio: {tracking}) foi Retirada com sucesso. Obrigado!',
    },
    {
      status: 'CANCELADO',
      message: 'Olá {name}, sua encomenda (Rastreio: {tracking}) foi Cancelada.',
    },
  ]
  for (const t of templates) {
    try {
      app.findFirstRecordByData('notification_templates', 'status', t.status)
    } catch (_) {
      const r = new Record(ntCol)
      r.set('status', t.status)
      r.set('message', t.message)
      app.save(r)
    }
  }
})
