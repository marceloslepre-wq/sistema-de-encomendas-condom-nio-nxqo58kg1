migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('condos')

    if (!col.fields.getByName('whatsapp_instance_name')) {
      col.fields.add(
        new TextField({
          name: 'whatsapp_instance_name',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('whatsapp_connected')) {
      col.fields.add(
        new BoolField({
          name: 'whatsapp_connected',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('whatsapp_phone')) {
      col.fields.add(
        new TextField({
          name: 'whatsapp_phone',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('whatsapp_status')) {
      col.fields.add(
        new SelectField({
          name: 'whatsapp_status',
          values: ['disconnected', 'connecting', 'connected'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('whatsapp_qrcode')) {
      col.fields.add(
        new TextField({
          name: 'whatsapp_qrcode',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('whatsapp_updated_at')) {
      col.fields.add(
        new DateField({
          name: 'whatsapp_updated_at',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('condos')
    if (col.fields.getByName('whatsapp_updated_at')) col.fields.removeByName('whatsapp_updated_at')
    if (col.fields.getByName('whatsapp_qrcode')) col.fields.removeByName('whatsapp_qrcode')
    if (col.fields.getByName('whatsapp_status')) col.fields.removeByName('whatsapp_status')
    if (col.fields.getByName('whatsapp_phone')) col.fields.removeByName('whatsapp_phone')
    if (col.fields.getByName('whatsapp_connected')) col.fields.removeByName('whatsapp_connected')
    if (col.fields.getByName('whatsapp_instance_name'))
      col.fields.removeByName('whatsapp_instance_name')
    app.save(col)
  },
)
