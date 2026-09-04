/**
 * 通讯录文件与原生选择器解析工具
 */

export interface ParsedContact {
  name: string
  phone?: string
  company?: string
  title?: string
  email?: string
  selected?: boolean
}

/**
 * 展开 vCard 折叠行 (RFC 2426 规范: 以空格或制表符开头的行是上一行的续行)
 */
function unfoldLines(rawText: string): string {
  return rawText.replace(/\r?\n[ \t]/g, '')
}

/**
 * 清理电话号码字符
 */
function cleanPhone(phoneStr: string): string {
  return phoneStr.replace(/[^\d+]/g, '').trim()
}

/**
 * 解析 vCard 文本格式 (.vcf / .vcard)
 */
export function parseVCF(rawContent: string): ParsedContact[] {
  if (!rawContent || !rawContent.includes('BEGIN:VCARD')) {
    return []
  }

  const unfolded = unfoldLines(rawContent)
  // 分割每张卡片
  const rawCards = unfolded.split(/BEGIN:VCARD/i).filter((block) => block.includes('END:VCARD'))
  const results: ParsedContact[] = []

  for (const card of rawCards) {
    const lines = card.split(/\r?\n/)
    let fnName = ''
    let nName = ''
    let phone: string | undefined
    let company: string | undefined
    let title: string | undefined
    let email: string | undefined

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      // FN: Formatted Name
      if (/^FN(;.*)?:/i.test(line)) {
        const val = line.replace(/^FN(;.*)?:/i, '').trim()
        if (val) fnName = val
      }
      // N: Family Name;Given Name;...
      else if (/^N(;.*)?:/i.test(line)) {
        const val = line.replace(/^N(;.*)?:/i, '').trim()
        const parts = val.split(';').filter(Boolean)
        if (parts.length > 0) {
          // 中文常见: 张;三 -> 张三
          nName = parts.join('')
        }
      }
      // TEL: 电话
      else if (/^TEL(;.*)?:/i.test(line) && !phone) {
        const val = line.replace(/^TEL(;.*)?:/i, '').trim()
        const cleaned = cleanPhone(val)
        if (cleaned) phone = cleaned
      }
      // ORG: 公司/组织
      else if (/^ORG(;.*)?:/i.test(line) && !company) {
        const val = line.replace(/^ORG(;.*)?:/i, '').trim()
        const parts = val.split(';').filter(Boolean)
        if (parts.length > 0) {
          company = parts[0].trim()
        }
      }
      // TITLE: 职位
      else if (/^TITLE(;.*)?:/i.test(line) && !title) {
        title = line.replace(/^TITLE(;.*)?:/i, '').trim()
      }
      // EMAIL: 邮箱
      else if (/^EMAIL(;.*)?:/i.test(line) && !email) {
        email = line.replace(/^EMAIL(;.*)?:/i, '').trim()
      }
    }

    const name = fnName || nName
    if (name) {
      results.push({
        name,
        phone,
        company,
        title,
        email,
        selected: true,
      })
    }
  }

  return results
}

/**
 * 兼容解析简单的 CSV / Excel 导出文件
 */
export function parseCSV(rawContent: string): ParsedContact[] {
  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headerLine = lines[0].toLowerCase()
  const delimiter = headerLine.includes('\t') ? '\t' : ','
  const headers = headerLine.split(delimiter).map((h) => h.replace(/["']/g, '').trim())

  // 匹配列索引
  const nameIndex = headers.findIndex((h) => h.includes('姓名') || h.includes('name'))
  const phoneIndex = headers.findIndex(
    (h) => h.includes('电话') || h.includes('手机') || h.includes('phone') || h.includes('tel')
  )
  const companyIndex = headers.findIndex(
    (h) => h.includes('公司') || h.includes('company') || h.includes('org')
  )
  const titleIndex = headers.findIndex(
    (h) => h.includes('职位') || h.includes('职务') || h.includes('title')
  )
  const emailIndex = headers.findIndex((h) => h.includes('邮箱') || h.includes('email'))

  if (nameIndex === -1 && phoneIndex === -1) {
    return []
  }

  const results: ParsedContact[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim())
    const name = nameIndex !== -1 ? cols[nameIndex] : ''
    const phone = phoneIndex !== -1 ? cleanPhone(cols[phoneIndex] || '') : undefined
    const company = companyIndex !== -1 ? cols[companyIndex] : undefined
    const title = titleIndex !== -1 ? cols[titleIndex] : undefined
    const email = emailIndex !== -1 ? cols[emailIndex] : undefined

    if (name) {
      results.push({
        name,
        phone: phone || undefined,
        company: company || undefined,
        title: title || undefined,
        email: email || undefined,
        selected: true,
      })
    }
  }

  return results
}

/**
 * 检查当前浏览器环境是否支持原生 Contact Picker API
 */
export function isContactPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window
}

/**
 * 调起浏览器原生 Contact Picker API 获取联系人
 */
export async function selectNativeContacts(): Promise<ParsedContact[]> {
  if (!isContactPickerSupported()) {
    throw new Error('当前浏览器不支持原生通讯录接口')
  }

  const nav = navigator as any
  const props = ['name', 'tel', 'email']
  const contacts = await nav.contacts.select(props, { multiple: true })

  const results: ParsedContact[] = []
  if (Array.isArray(contacts)) {
    for (const c of contacts) {
      const name = Array.isArray(c.name) ? c.name[0] : c.name
      const phone = Array.isArray(c.tel) && c.tel.length > 0 ? cleanPhone(c.tel[0]) : undefined
      const email = Array.isArray(c.email) && c.email.length > 0 ? c.email[0] : undefined

      if (name) {
        results.push({
          name: name.trim(),
          phone: phone || undefined,
          email: email || undefined,
          selected: true,
        })
      }
    }
  }

  return results
}
