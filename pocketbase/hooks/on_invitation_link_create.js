onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const token = record.getString('token')
  const unitId = record.getString('unit_id')

  // Mock sending email using the generated token
  $app
    .logger()
    .info(
      'Email template prepared: New Resident Invitation',
      'token',
      token,
      'unit_id',
      unitId,
      'url',
      `/cadastro?token=${token}`,
    )
}, 'invitation_links')
