migrate(
  (app) => {
    // 1. Atualizar o campo role na collection users para incluir 'master' sem remover os existentes
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const roleField = usersCol.fields.getByName('role')
      if (roleField && roleField.values) {
        if (!roleField.values.includes('master')) {
          roleField.values.push('master')
          app.save(usersCol)
        }
      }
    } catch (e) {
      console.log('Erro ao adicionar role master aos users:', e)
    }

    // 2. Criar a collection 'planos'
    try {
      app.findCollectionByNameOrId('planos')
    } catch (_) {
      const planosCol = new Collection({
        name: 'planos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'preco_mensal', type: 'number', required: false },
          { name: 'max_moradores', type: 'number', required: false },
          { name: 'max_units', type: 'number', required: false },
          { name: 'recursos_liberados', type: 'json', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ativo', 'inativo'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(planosCol)
    }

    // 3. Criar a collection 'licencas'
    try {
      app.findCollectionByNameOrId('licencas')
    } catch (_) {
      const condosCol = app.findCollectionByNameOrId('condos')
      const planosCol = app.findCollectionByNameOrId('planos')

      const licencasCol = new Collection({
        name: 'licencas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'master' || @request.auth.role = 'admin'",
        fields: [
          {
            name: 'condo_id',
            type: 'relation',
            required: true,
            collectionId: condosCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'plano_id',
            type: 'relation',
            required: true,
            collectionId: planosCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ativa', 'pausada', 'cancelada', 'expirada'],
            maxSelect: 1,
          },
          { name: 'data_expiracao', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(licencasCol)
    }
  },
  (app) => {
    try {
      const licencasCol = app.findCollectionByNameOrId('licencas')
      app.delete(licencasCol)
    } catch (_) {}

    try {
      const planosCol = app.findCollectionByNameOrId('planos')
      app.delete(planosCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const roleField = usersCol.fields.getByName('role')
      if (roleField && roleField.values) {
        roleField.values = roleField.values.filter((v) => v !== 'master')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
