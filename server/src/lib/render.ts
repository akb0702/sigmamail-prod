import juice from 'juice'

export interface DirectoryUser {
  email: string
  fullName: string
  title?: string
  phone?: string
  photoUrl?: string
}

export interface SocialLink {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'website'
  url: string
}

export interface TemplateConfig {
  // Legacy fields (kept for back-compat with templates published pre-2e)
  templateName?: string
  mainColor: string
  fontFamily: string
  fields: {
    showTitle: boolean
    showPhone: boolean
    showPhoto: boolean
  }
  // Brand
  companyName?: string
  website?: string
  tagline?: string
  logoUrl?: string
  // Style
  secondaryColor?: string
  fontSize?: number
  avatarShape?: 'square' | 'round'
  avatarSize?: number
  // Optional blocks
  socials?: SocialLink[]
  disclaimer?: string
  cta?: { text: string; url: string } | null
}

const FALLBACK_FONT = 'Arial, Helvetica, sans-serif'

const SOCIAL_ICON_BASE = 'https://cdn.simpleicons.org' // SVG icons, monochrome by query

function esc(str: string | undefined | null): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function socialIcon(platform: SocialLink['platform'], color: string): string {
  // simpleicons.org serves SVGs colored by hex (no leading #). Fall back to text label.
  const map: Record<SocialLink['platform'], string> = {
    linkedin: 'linkedin',
    twitter: 'x', // X (formerly twitter)
    instagram: 'instagram',
    facebook: 'facebook',
    youtube: 'youtube',
    website: 'googlechrome',
  }
  const slug = map[platform]
  const hex = color.replace('#', '')
  return `${SOCIAL_ICON_BASE}/${slug}/${hex}`
}

function renderSocials(socials: SocialLink[] | undefined, color: string): string {
  if (!socials?.length) return ''
  const items = socials
    .filter((s) => s.url)
    .map(
      (s) => `
        <td class="aa-social-cell">
          <a href="${esc(s.url)}" class="aa-social-link">
            <img src="${socialIcon(s.platform, color)}" alt="${esc(s.platform)}" width="18" height="18" class="aa-social-img"/>
          </a>
        </td>`,
    )
    .join('')
  if (!items) return ''
  return `
    <tr><td class="aa-spacer-8"></td></tr>
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>${items}</tr>
        </table>
      </td>
    </tr>`
}

function renderCta(cta: TemplateConfig['cta'], color: string): string {
  if (!cta?.text || !cta.url) return ''
  return `
    <tr><td class="aa-spacer-12"></td></tr>
    <tr>
      <td>
        <a href="${esc(cta.url)}" class="aa-cta" style="background:${esc(color)};">
          ${esc(cta.text)}
        </a>
      </td>
    </tr>`
}

function renderDisclaimer(disclaimer: string | undefined): string {
  if (!disclaimer?.trim()) return ''
  return `
    <tr><td class="aa-spacer-12"></td></tr>
    <tr>
      <td>
        <p class="aa-disclaimer">${esc(disclaimer)}</p>
      </td>
    </tr>`
}

export function renderSignature(user: DirectoryUser, config: TemplateConfig): string {
  const main = config.mainColor || '#0a66c2'
  const secondary = config.secondaryColor || '#555555'
  const font = config.fontFamily || FALLBACK_FONT
  const fontSize = config.fontSize ?? 13
  const avatarSize = config.avatarSize ?? 72
  const avatarRadius = config.avatarShape === 'round' ? '50%' : '6px'

  const showPhoto = config.fields.showPhoto && user.photoUrl
  const showTitle = config.fields.showTitle && user.title
  const showPhone = config.fields.showPhone && user.phone

  const photoCell = showPhoto
    ? `
        <td valign="top" class="aa-photo-cell">
          <img src="${esc(user.photoUrl!)}" width="${avatarSize}" height="${avatarSize}"
               class="aa-photo"
               style="border-radius:${avatarRadius};"
               alt=""/>
        </td>`
    : ''

  const titleRow = showTitle
    ? `<div class="aa-title">${esc(user.title!)}${config.companyName ? ` · ${esc(config.companyName)}` : ''}</div>`
    : config.companyName
      ? `<div class="aa-title">${esc(config.companyName)}</div>`
      : ''

  const phoneRow = showPhone
    ? `<a href="tel:${esc(user.phone!.replace(/\s+/g, ''))}" class="aa-meta-link">${esc(user.phone!)}</a>`
    : ''

  const websiteRow = config.website
    ? `<a href="${esc(config.website.startsWith('http') ? config.website : `https://${config.website}`)}" class="aa-meta-link">${esc(config.website.replace(/^https?:\/\//, ''))}</a>`
    : ''

  const metaParts = [
    `<a href="mailto:${esc(user.email)}" class="aa-meta-link">${esc(user.email)}</a>`,
    phoneRow,
    websiteRow,
  ].filter(Boolean)

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  .aa-root {
    font-family: ${font};
    font-size: ${fontSize}px;
    color: #222222;
    line-height: 1.45;
  }
  .aa-name {
    font-size: ${fontSize + 4}px;
    font-weight: 700;
    color: ${main};
    line-height: 1.2;
  }
  .aa-title {
    color: ${secondary};
    font-size: ${fontSize - 1}px;
    margin-top: 2px;
  }
  .aa-divider {
    border-top: 2px solid ${main};
    width: 36px;
    margin: 8px 0;
    line-height: 0;
    font-size: 0;
  }
  .aa-meta-link {
    color: ${main};
    text-decoration: none;
    font-size: ${fontSize - 1}px;
  }
  .aa-meta-sep {
    color: #cccccc;
    padding: 0 6px;
  }
  .aa-photo-cell { padding-right: 16px; }
  .aa-photo { display: block; border: 0; }
  .aa-spacer-8 { height: 8px; line-height: 8px; font-size: 0; }
  .aa-spacer-12 { height: 12px; line-height: 12px; font-size: 0; }
  .aa-social-cell { padding-right: 8px; }
  .aa-social-link { display: inline-block; line-height: 0; }
  .aa-social-img { display: block; border: 0; }
  .aa-cta {
    display: inline-block;
    padding: 8px 16px;
    color: #ffffff !important;
    background: ${main};
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
    font-size: ${fontSize - 1}px;
  }
  .aa-disclaimer {
    color: #999999;
    font-size: ${fontSize - 3}px;
    line-height: 1.4;
    margin: 0;
    max-width: 480px;
  }
</style>
</head>
<body>
<table cellpadding="0" cellspacing="0" border="0" class="aa-root">
  <tr>
    ${photoCell}
    <td valign="top">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td>
          <div class="aa-name">${esc(user.fullName) || esc(user.email)}</div>
          ${titleRow}
          <div class="aa-divider">&nbsp;</div>
          <div>
            ${metaParts.join('<span class="aa-meta-sep">·</span>')}
          </div>
        </td></tr>
        ${renderSocials(config.socials, main)}
        ${renderCta(config.cta ?? null, main)}
        ${renderDisclaimer(config.disclaimer)}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`

  // Inline all CSS and strip the <style> block so Outlook etc. render it.
  return juice(html, { removeStyleTags: true, preserveImportant: true })
}
