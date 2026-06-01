migrate(
  (app) => {
    const logs = new Collection({
      name: 'whatsapp_logs',
      type: 'base',
      listRule: "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'",
      viewRule: "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'phone', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        { name: 'tipo', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(logs)

    const verifs = new Collection({
      name: 'whatsapp_verifications',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'phone', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'expires_at', type: 'date', required: true },
        { name: 'used', type: 'bool', required: false },
        { name: 'attempts', type: 'number', required: false },
        { name: 'locked_until', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(verifs)

    const audits = new Collection({
      name: 'recebimentos_auditoria',
      type: 'base',
      listRule: "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'",
      viewRule: "@request.auth.role = 'gestor' || @request.auth.role = 'portaria'",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'morador_nome', type: 'text', required: false },
        { name: 'morador_cpf', type: 'text', required: false },
        { name: 'morador_celular', type: 'text', required: false },
        { name: 'codigo_enviado', type: 'text', required: false },
        { name: 'codigo_validado', type: 'bool', required: false },
        { name: 'data_hora_recebimento', type: 'date', required: false },
        { name: 'status', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(audits)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('whatsapp_logs'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('whatsapp_verifications'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('recebimentos_auditoria'))
    } catch (e) {}
  },
)
