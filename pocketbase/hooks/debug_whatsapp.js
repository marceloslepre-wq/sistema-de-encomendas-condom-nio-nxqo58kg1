/*
  ====================================================================================================
  DEBUG ROUTE - WHATSAPP VERIFICATIONS
  ====================================================================================================
  User Story Tool: Audit and verify consistency of validation codes
  Rota: GET /backend/v1/debug/whatsapp-verifications
  ====================================================================================================
*/

routerAdd(
  'GET',
  '/backend/v1/debug/whatsapp-verifications',
  (e) => {
    try {
      const phone = e.request.url.query().get('phone') || ''
      const receivedCode = e.request.url.query().get('received_code') || 'N/A'

      let filter = ''
      let bindParams = {}
      if (phone) {
        const numericPhone = phone.replace(/\D/g, '')
        const exactPhone =
          numericPhone.startsWith('55') && numericPhone.length > 11
            ? numericPhone
            : `55${numericPhone}`
        filter = 'phone = {:phone}'
        bindParams = { phone: exactPhone }
      }

      const records = $app.findRecordsByFilter(
        'whatsapp_verifications',
        filter,
        '-created',
        1,
        0,
        bindParams,
      )

      if (!records || records.length === 0) {
        return e.notFoundError('No verification records found for analysis.')
      }

      const record = records[0]
      const storedCode = record.getString('code')

      const formatCheck = /^\d+$/.test(storedCode)
        ? 'Numbers only'
        : 'Contains non-numeric characters'
      const hasSpaces = /\s/.test(storedCode) || storedCode !== storedCode.trim()

      const createdStr = record.getString('created')
      const expiresStr = record.getString('expires_at')

      // Handle PB's internal string format 'YYYY-MM-DD HH:mm:ss.SSSZ'
      const createdDate = new Date(createdStr.replace(' ', 'T'))
      const expiresDate = new Date(expiresStr.replace(' ', 'T'))
      const diffMinutes = Math.round((expiresDate.getTime() - createdDate.getTime()) / 60000)

      const match = receivedCode !== 'N/A' ? storedCode === receivedCode : null

      const report = {
        record_id: record.id,
        phone: record.getString('phone'),
        fields_analysis: {
          code: storedCode,
          format_check: formatCheck,
          has_spaces: hasSpaces,
          created: createdStr,
          expires_at: expiresStr,
        },
        timing_consistency: {
          time_difference_minutes: diffMinutes,
          is_exactly_15_minutes: diffMinutes === 15,
        },
        verification_logic_check: {
          exact_stored_code: storedCode,
          exact_received_code: receivedCode,
          codes_match: match,
          case_sensitivity_check:
            storedCode.toLowerCase() === storedCode.toUpperCase()
              ? 'Not applicable (numeric)'
              : storedCode === receivedCode
                ? 'Exact case match'
                : 'Case mismatch possible',
        },
        outcome_reporting: {
          formatted_created: createdDate.toISOString(),
          formatted_expires_at: expiresDate.toISOString(),
          is_active: expiresDate > new Date(),
        },
      }

      return e.json(200, report)
    } catch (err) {
      return e.internalServerError('Debug endpoint error: ' + err.message)
    }
  },
  $apis.requireSuperuserAuth(),
)
