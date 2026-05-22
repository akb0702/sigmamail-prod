import { gmailFor } from './lib/google.js'

const TARGET = process.env.TARGET_EMAIL ?? 'akbar@aadrila.com'

const html = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#222;">
  <tr>
    <td style="padding-right:14px;border-right:2px solid #0a66c2;">
      <strong style="font-size:15px;color:#0a66c2;">Akbar</strong><br/>
      <span style="color:#666;">Aadrila</span>
    </td>
    <td style="padding-left:14px;">
      <a href="mailto:akbar@aadrila.com" style="color:#0a66c2;text-decoration:none;">akbar@aadrila.com</a><br/>
      <a href="https://aadrila.com" style="color:#0a66c2;text-decoration:none;">aadrila.com</a>
    </td>
  </tr>
</table>
<p style="font-size:11px;color:#999;margin-top:8px;">Pushed via Aadrila Signature Manager (test)</p>
`.trim()

async function main() {
  console.log(`Pushing test signature to ${TARGET}...`)
  const gmail = gmailFor(TARGET)

  const sendAsList = await gmail.users.settings.sendAs.list({ userId: 'me' })
  const primary = sendAsList.data.sendAs?.find((a) => a.isPrimary)
  if (!primary?.sendAsEmail) throw new Error('No primary sendAs alias found')

  await gmail.users.settings.sendAs.update({
    userId: 'me',
    sendAsEmail: primary.sendAsEmail,
    requestBody: { signature: html },
  })

  console.log(
    `OK. Open Gmail → Settings → "Signature" — you should see the test signature on alias ${primary.sendAsEmail}.`,
  )
}

main().catch((err) => {
  console.error('Push failed:', err?.response?.data ?? err)
  process.exit(1)
})
