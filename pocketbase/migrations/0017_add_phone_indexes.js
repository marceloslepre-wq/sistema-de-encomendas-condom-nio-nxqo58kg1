migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.addIndex('idx_users_phone', false, 'phone', '')
    app.save(users)

    const sms = app.findCollectionByNameOrId('sms_verifications')
    sms.addIndex('idx_sms_phone', false, 'phone', '')
    app.save(sms)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.removeIndex('idx_users_phone')
    app.save(users)

    const sms = app.findCollectionByNameOrId('sms_verifications')
    sms.removeIndex('idx_sms_phone')
    app.save(sms)
  },
)
