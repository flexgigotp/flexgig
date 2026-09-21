export type ProviderId = 'mtn' | 'airtel' | 'glo' | 'ninemobile'

export interface ProviderInfo {
  id: ProviderId
  label: string
  color: string
  img: string
  prefixes: string[]
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'mtn',
    label: 'MTN',
    color: '#FFCC00',
    img: '/frontend/svg/MTN-icon.svg',
    prefixes: [
      '0702', '0703', '0704', '0706', '0707', '0803', '0806',
      '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916',
    ],
  },
  {
    id: 'airtel',
    label: 'AIRTEL',
    color: '#FF0000',
    img: '/frontend/svg/airtel-icon.svg',
    prefixes: [
      '0701', '0708', '0802', '0808', '0812',
      '0901', '0902', '0904', '0907', '0911', '0912',
    ],
  },
  {
    id: 'glo',
    label: 'GLO',
    color: '#00B140',
    img: '/frontend/svg/GLO-icon.svg',
    prefixes: ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
  },
  {
    id: 'ninemobile',
    label: '9MOBILE',
    color: '#7DB700',
    img: '/frontend/svg/9mobile-icon.svg',
    prefixes: ['0809', '0817', '0818', '0908', '0909'],
  },
]

export function detectProvider(phone: string): ProviderId | null {
  let normalized = phone.replace(/^\+234/, '0')
  if (!normalized.startsWith('0')) normalized = '0' + normalized
  const prefix = normalized.slice(0, 4)
  for (const p of PROVIDERS) {
    if (p.prefixes.includes(prefix)) return p.id
  }
  return null
}

export function formatNgPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '')
  let norm = cleaned
  if (norm.startsWith('+234')) norm = '0' + norm.slice(4)
  if (norm.startsWith('234')) norm = '0' + norm.slice(3)
  if (norm.length > 11) norm = norm.slice(0, 11)
  if (norm.length <= 4) return norm
  if (norm.length <= 7) return `${norm.slice(0, 4)} ${norm.slice(4)}`
  return `${norm.slice(0, 4)} ${norm.slice(4, 7)} ${norm.slice(7)}`
}

export function normalizeNgPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '')
  if (cleaned.startsWith('+234')) return '0' + cleaned.slice(4)
  if (cleaned.startsWith('234') && cleaned.length === 13)
    return '0' + cleaned.slice(3)
  return cleaned
}

export function isValidNgPhone(phone: string): boolean {
  const digits = normalizeNgPhone(phone)
  return digits.length === 11 && /^0[789][01]\d{8}$/.test(digits)
}