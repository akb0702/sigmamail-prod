export interface DirectoryUser {
  email: string
  fullName: string
  title?: string
  phone?: string
  photoUrl?: string
}

export interface TemplateConfig {
  templateName: string
  mainColor: string
  fontFamily: string
  fields: {
    showTitle: boolean
    showPhone: boolean
    showPhoto: boolean
  }
}

const FALLBACK_FONT = 'Arial, Helvetica, sans-serif'

function escape(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderSignature(user: DirectoryUser, config: TemplateConfig): string {
  const color = config.mainColor
  const font = config.fontFamily || FALLBACK_FONT
  const photo =
    config.fields.showPhoto && user.photoUrl
      ? `<td style="padding-right:14px;vertical-align:top;"><img src="${escape(user.photoUrl)}" width="64" height="64" style="border-radius:50%;display:block;" alt=""/></td>`
      : ''

  const title =
    config.fields.showTitle && user.title
      ? `<div style="color:#666;font-size:13px;">${escape(user.title)}</div>`
      : ''

  const phone =
    config.fields.showPhone && user.phone
      ? `<div style="color:#666;font-size:12px;margin-top:2px;">${escape(user.phone)}</div>`
      : ''

  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${font};font-size:13px;color:#222;">
  <tr>
    ${photo}
    <td style="padding-left:${photo ? '14px' : '0'};border-left:${photo ? `2px solid ${color}` : 'none'};vertical-align:top;">
      <div style="font-size:15px;font-weight:bold;color:${color};">${escape(user.fullName)}</div>
      ${title}
      <div style="margin-top:6px;">
        <a href="mailto:${escape(user.email)}" style="color:${color};text-decoration:none;font-size:12px;">${escape(user.email)}</a>
      </div>
      ${phone}
    </td>
  </tr>
</table>`.trim()
}
