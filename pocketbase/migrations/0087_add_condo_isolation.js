migrate(
  (app) => {
    // Obter condomínio padrão ("Condomínio Residencial Parque")
    let defaultCondoId = ''
    try {
      const defaultCondo = app.findFirstRecordByData(
        'condos',
        'name',
        'Condomínio Residencial Parque',
      )
      defaultCondoId = defaultCondo.id
    } catch (_) {
      try {
        const anyCondo = app.findRecordsByFilter('condos', '1=1', 'created', 1, 0)
        if (anyCondo.length > 0) defaultCondoId = anyCondo[0].id
      } catch (e) {
        console.log('Condo not found:', e)
      }
    }

    const condosCol = app.findCollectionByNameOrId('condos')
    const condoCollectionId = condosCol.id

    // 1. Adicionar campo 'condo_id' (Relation -> condos) nas coleções de dados que não o possuem
    const collectionsToUpdate = [
      'users',
      'recebimentos_auditoria',
      'moradores',
      'carriers',
      'templates_notificacao',
      'notificacoes_enviadas',
      'volume_types',
      'shelf_locations',
      'historico_andamento',
      'whatsapp_verifications',
      'whatsapp_logs',
      'invitation_links',
      'entregadores',
    ]

    for (const colName of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        if (!col.fields.getByName('condo_id')) {
          col.fields.add(
            new RelationField({
              name: 'condo_id',
              collectionId: condoCollectionId,
              required: false,
              maxSelect: 1,
              cascadeDelete: false,
            }),
          )
          app.save(col)
        }
      } catch (err) {
        console.log(`Erro ao adicionar condo_id em ${colName}:`, err)
      }
    }

    // 2. Preencher condo_id nos registros existentes onde condo_id IS NULL ou vazio
    if (defaultCondoId) {
      // Para 'users', atualizamos quem não for 'master'
      try {
        app
          .db()
          .newQuery(
            `UPDATE users SET condo_id = {:condoId} WHERE (condo_id IS NULL OR condo_id = '') AND (role IS NULL OR role != 'master')`,
          )
          .bind({ condoId: defaultCondoId })
          .execute()
      } catch (err) {
        console.log('Erro ao migrar dados de users:', err)
      }

      // Para 'units', garantir que qualquer uma sem condo_id receba defaultCondoId
      try {
        app
          .db()
          .newQuery(
            `UPDATE units SET condo_id = {:condoId} WHERE (condo_id IS NULL OR condo_id = '')`,
          )
          .bind({ condoId: defaultCondoId })
          .execute()
      } catch (err) {
        console.log('Erro ao atualizar condo_id em units:', err)
      }

      // Demais coleções de dados de negócio
      const dataTables = [
        'recebimentos_auditoria',
        'moradores',
        'carriers',
        'templates_notificacao',
        'notificacoes_enviadas',
        'volume_types',
        'shelf_locations',
        'historico_andamento',
        'whatsapp_verifications',
        'whatsapp_logs',
        'invitation_links',
        'entregadores',
      ]

      for (const table of dataTables) {
        try {
          app
            .db()
            .newQuery(
              `UPDATE ${table} SET condo_id = {:condoId} WHERE condo_id IS NULL OR condo_id = ''`,
            )
            .bind({ condoId: defaultCondoId })
            .execute()
        } catch (err) {
          console.log(`Erro ao preencher condo_id em ${table}:`, err)
        }
      }
    }

    // 3. Configurar API rules para isolamento multi-tenant
    // Regra padrão multi-tenant:
    // Acesso permitido se:
    // - O usuário autenticado for 'master' ou 'admin': vê tudo de todos os condomínios
    // - OU o registro tem condo_id = @request.auth.condo_id (e @request.auth.condo_id != '')

    // Coleções com isolamento completo e regras adaptadas:

    // CONDOS
    try {
      const condos = app.findCollectionByNameOrId('condos')
      condos.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && id = @request.auth.condo_id)"
      condos.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && id = @request.auth.condo_id)"
      condos.createRule = "@request.auth.role = 'master' || @request.auth.role = 'admin'"
      condos.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      condos.deleteRule = "@request.auth.role = 'master' || @request.auth.role = 'admin'"
      app.save(condos)
    } catch (e) {
      console.log('Erro ao configurar rules de condos:', e)
    }

    // USERS
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      users.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || id = @request.auth.id || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      users.createRule =
        "(@request.auth.id != '' && (@request.auth.role = 'master' || @request.auth.role = 'admin' || @request.auth.role = 'gestor')) || (@request.auth.id = '' && @request.body.role = 'morador')"
      users.updateRule =
        "id = @request.auth.id || @request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && condo_id = @request.auth.condo_id)"
      users.deleteRule =
        "id = @request.auth.id || @request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && condo_id = @request.auth.condo_id)"
      app.save(users)
    } catch (e) {
      console.log('Erro ao configurar rules de users:', e)
    }

    // UNITS
    try {
      const units = app.findCollectionByNameOrId('units')
      units.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      units.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      units.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && @request.auth.condo_id != '')"
      units.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && condo_id = @request.auth.condo_id)"
      units.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && condo_id = @request.auth.condo_id)"
      app.save(units)
    } catch (e) {
      console.log('Erro ao configurar rules de units:', e)
    }

    // RECEBIMENTOS_AUDITORIA
    try {
      const rec = app.findCollectionByNameOrId('recebimentos_auditoria')
      rec.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem' || (@request.auth.role = 'morador' && morador_id = @request.auth.id)))"
      rec.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem' || (@request.auth.role = 'morador' && morador_id = @request.auth.id)))"
      rec.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      rec.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      rec.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(rec)
    } catch (e) {
      console.log('Erro ao configurar rules de recebimentos_auditoria:', e)
    }

    // MORADORES
    try {
      const moradores = app.findCollectionByNameOrId('moradores')
      moradores.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      moradores.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      moradores.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && @request.auth.condo_id != '') || @request.auth.role = 'morador' || @request.auth.id = ''"
      moradores.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      moradores.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(moradores)
    } catch (e) {
      console.log('Erro ao configurar rules de moradores:', e)
    }

    // CARRIERS
    try {
      const carriers = app.findCollectionByNameOrId('carriers')
      carriers.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      carriers.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      carriers.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      carriers.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      carriers.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(carriers)
    } catch (e) {
      console.log('Erro ao configurar rules de carriers:', e)
    }

    // TEMPLATES_NOTIFICACAO
    try {
      const templates = app.findCollectionByNameOrId('templates_notificacao')
      templates.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      templates.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      templates.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      templates.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      templates.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(templates)
    } catch (e) {
      console.log('Erro ao configurar rules de templates_notificacao:', e)
    }

    // NOTIFICACOES_ENVIADAS
    try {
      const notifs = app.findCollectionByNameOrId('notificacoes_enviadas')
      notifs.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      notifs.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      notifs.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      notifs.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      notifs.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(notifs)
    } catch (e) {
      console.log('Erro ao configurar rules de notificacoes_enviadas:', e)
    }

    // VOLUME_TYPES
    try {
      const vol = app.findCollectionByNameOrId('volume_types')
      vol.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      vol.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      vol.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && @request.auth.role = 'gestor')"
      vol.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      vol.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(vol)
    } catch (e) {
      console.log('Erro ao configurar rules de volume_types:', e)
    }

    // SHELF_LOCATIONS
    try {
      const shelf = app.findCollectionByNameOrId('shelf_locations')
      shelf.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      shelf.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      shelf.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && @request.auth.role = 'gestor')"
      shelf.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      shelf.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(shelf)
    } catch (e) {
      console.log('Erro ao configurar rules de shelf_locations:', e)
    }

    // HISTORICO_ANDAMENTO
    try {
      const hist = app.findCollectionByNameOrId('historico_andamento')
      hist.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      hist.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      hist.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      app.save(hist)
    } catch (e) {
      console.log('Erro ao configurar rules de historico_andamento:', e)
    }

    // WHATSAPP_VERIFICATIONS
    try {
      const wv = app.findCollectionByNameOrId('whatsapp_verifications')
      wv.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      wv.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      wv.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      wv.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      wv.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(wv)
    } catch (e) {
      console.log('Erro ao configurar rules de whatsapp_verifications:', e)
    }

    // WHATSAPP_LOGS
    try {
      const wl = app.findCollectionByNameOrId('whatsapp_logs')
      wl.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      wl.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(wl)
    } catch (e) {
      console.log('Erro ao configurar rules de whatsapp_logs:', e)
    }

    // INVITATION_LINKS
    try {
      const inv = app.findCollectionByNameOrId('invitation_links')
      inv.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      inv.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      inv.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && @request.auth.role = 'gestor')"
      inv.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      inv.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && @request.auth.role = 'gestor')"
      app.save(inv)
    } catch (e) {
      console.log('Erro ao configurar rules de invitation_links:', e)
    }

    // ENTREGADORES
    try {
      const ent = app.findCollectionByNameOrId('entregadores')
      ent.listRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      ent.viewRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id)"
      ent.createRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      ent.updateRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      ent.deleteRule =
        "@request.auth.role = 'master' || @request.auth.role = 'admin' || (@request.auth.condo_id != '' && condo_id = @request.auth.condo_id && (@request.auth.role = 'gestor' || @request.auth.role = 'portaria' || @request.auth.role = 'porteiro' || @request.auth.role = 'triagem'))"
      app.save(ent)
    } catch (e) {
      console.log('Erro ao configurar rules de entregadores:', e)
    }
  },
  (app) => {
    // Reverter regras e campos não é recomendado em produção, mas fornecemos o down
    const collections = [
      'users',
      'recebimentos_auditoria',
      'moradores',
      'carriers',
      'templates_notificacao',
      'notificacoes_enviadas',
      'volume_types',
      'shelf_locations',
      'historico_andamento',
      'whatsapp_verifications',
      'whatsapp_logs',
      'invitation_links',
      'entregadores',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        const field = col.fields.getByName('condo_id')
        if (field) {
          col.fields.removeByName('condo_id')
          app.save(col)
        }
      } catch (_) {}
    }
  },
)
