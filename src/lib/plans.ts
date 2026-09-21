import type { DataPlan } from '@/types/api'

export function plansForProvider(
  allPlans: DataPlan[],
  provider: string
): DataPlan[] {
  const key = provider === 'ninemobile' ? '9mobile' : provider.toLowerCase()
  return allPlans.filter(
    (p) => p.provider?.toLowerCase() === key && p.active === true
  )
}

export function sortByPrice(plans: DataPlan[]): DataPlan[] {
  return [...plans].sort((a, b) => Number(a.price) - Number(b.price))
}

/**
 * MTN preview from old site:
 *   - If SPECIAL available → show it first, then first of CG→AWOOF→GIFTING
 *   - Otherwise → first of CG, then first of AWOOF, then GIFTING
 * The backend uses "DATA SHARE" where the old site called it "CG".
 */
export function pickPreviewPlans(
  providerPlans: DataPlan[],
  provider: string
): DataPlan[] {
  const matchCategory = (plan: DataPlan, cats: string[]) =>
    cats.includes((plan.category || '').toUpperCase())

  const byCategory = (cats: string[]) =>
    sortByPrice(providerPlans.filter((p) => matchCategory(p, cats)))

  if (provider === 'ninemobile') {
    return sortByPrice(providerPlans).slice(0, 2)
  }

  const special = byCategory(['SPECIAL'])
  const dataShare = byCategory(['CG', 'DATA SHARE'])
  const awoof = byCategory(['AWOOF'])
  const gifting = byCategory(['GIFTING'])

  if (provider === 'airtel') {
    const result: DataPlan[] = []
    if (awoof[0]) result.push(awoof[0])
    if (dataShare[0]) result.push(dataShare[0])
    return result
  }

  if (provider === 'glo') {
    const result: DataPlan[] = []
    if (dataShare[0]) result.push(dataShare[0])
    else if (awoof[0]) result.push(awoof[0])
    if (gifting[0]) result.push(gifting[0])
    return result
  }

  // MTN
  const result: DataPlan[] = []
  if (special[0]) result.push(special[0])
  const slotsToFill = result.length > 0 ? 1 : 2
  const fallbackGroups: DataPlan[][] = [dataShare, awoof, gifting]
  let filled = 0
  for (const group of fallbackGroups) {
    if (filled >= slotsToFill) break
    if (group[0]) {
      result.push(group[0])
      filled++
    }
  }
  return result
}

export function formatPlanPrice(price: number): string {
  return `₦${Number(price).toLocaleString('en-NG')}`
}

export interface PlanCategory {
  key: string
  label: string
  plans: DataPlan[]
}

/**
 * Group a provider's plans by category, sorted within each group by price.
 * Section order matches the old site: SPECIAL → DATA SHARE / CG → AWOOF → GIFTING.
 */
export function groupPlansByCategory(
  providerPlans: DataPlan[]
): PlanCategory[] {
  const CATEGORY_ORDER = [
    'SPECIAL',
    'DATA SHARE',
    'CG',
    'AWOOF',
    'GIFTING',
  ]
  const TITLE_OVERRIDES: Record<string, string> = {
    SPECIAL: 'SPECIAL LIMITED',
    CG: 'DATA SHARE',
  }

  const byCategory = new Map<string, DataPlan[]>()
  for (const plan of providerPlans) {
    const cat = (plan.category || 'STANDARD').toUpperCase()
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(plan)
  }

  const sections: PlanCategory[] = []
  const ordered = Array.from(byCategory.entries()).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a[0])
    const ib = CATEGORY_ORDER.indexOf(b[0])
    if (ia === -1 && ib === -1) return a[0].localeCompare(b[0])
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  for (const [key, plans] of ordered) {
    sections.push({
      key,
      label: TITLE_OVERRIDES[key] || key,
      plans: sortByPrice(plans),
    })
  }
  return sections
}

/**
 * Special plan state machine for MTN SPECIAL plans.
 * Mirrors the backend purchase gate exactly.
 */
export type SpecialState =
  | 'available'
  | 'daily_sold_out'
  | 'monthly_sold_out'
  | 'window_closed'

export function getSpecialPlanState(plan: {
  category?: string
  daily_available_slots?: number
  daily_purchase_count?: number
  monthly_sold_out?: boolean
}): SpecialState {
  if (plan.category?.toUpperCase() !== 'SPECIAL') return 'available'
  if (plan.monthly_sold_out === true) return 'monthly_sold_out'

  const day = new Date().getUTCDate()
  if (day > 10) return 'window_closed'

  const slots = Number(plan.daily_available_slots) || 0
  const used = Number(plan.daily_purchase_count) || 0
  if (slots > 0 && used >= slots) return 'daily_sold_out'
  return 'available'
}

export function specialStateLabel(state: SpecialState): string {
  switch (state) {
    case 'available':
      return 'Available'
    case 'daily_sold_out':
      return 'Sold out today'
    case 'monthly_sold_out':
      return 'Sold out this month'
    case 'window_closed':
      return 'Available 1st–10th'
  }
}