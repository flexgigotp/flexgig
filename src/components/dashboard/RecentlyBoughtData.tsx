import type { RecentDataTx } from '@/types/api'
import { useDataPurchaseStore } from '@/stores/dataPurchaseStore'
import { detectProvider, normalizeNgPhone } from '@/lib/providers'

interface RecentlyBoughtDataProps {
  plans?: RecentDataTx[]
}

const PROVIDER_COLORS: Record<string, string> = {
  mtn: '#FFCC00',
  airtel: '#FF0000',
  glo: '#00B140',
  '9mobile': '#7DB700',
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn: 'Mtn',
  airtel: 'Airtel',
  glo: 'Glo',
  '9mobile': '9mobile',
}

function normalizeProvider(raw: string): string {
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower === 'ninemobile' || lower === '9mobile') return '9mobile'
  return lower
}

function formatPhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\s+/g, '')
  if (cleaned.startsWith('+234')) return '0' + cleaned.slice(4)
  if (cleaned.startsWith('234') && cleaned.length === 13) return '0' + cleaned.slice(3)
  return cleaned
}

export default function RecentlyBoughtData({ plans = [] }: RecentlyBoughtDataProps) {
  // Only show successful purchases with a phone number, max 5
  const visible = plans
    .filter(
      (p) =>
        p.phone &&
        p.phone.trim() &&
        (p.status || '').toLowerCase() === 'success'
    )
    .slice(0, 5)

  if (visible.length === 0) return null
  const setPhone = useDataPurchaseStore((s) => s.setPhone)
const setProvider = useDataPurchaseStore((s) => s.setProvider)
const setPlanId = useDataPurchaseStore((s) => s.setPlanId)

const handleReuse = (phone: string) => {
  const cleaned = normalizeNgPhone(phone)
  setPhone(cleaned)
  setPlanId(null) // clear any previously selected plan

  const detected = detectProvider(cleaned)
  if (detected) setProvider(detected)


}

  return (
    <div className="recent-transactions active">
      <h4>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.36-7.36l-1.42 1.42M6.64 19.36l-1.42-1.42M19.36 19.36l-1.42-1.42M6.64 4.64l-1.42 1.42"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Recently Bought Data
      </h4>
      <div className="recent-transactions-list">
        {visible.map((p, idx) => {
          const provider = normalizeProvider(p.provider || '')
          const dataAmount = p.data_amount || p.dataAmount || 'Data'
          return (
            <div
                key={p.reference || idx}
                className="recent-transaction-item"
                role="button"
                tabIndex={0}
                onClick={() => handleReuse(p.phone)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                    handleReuse(p.phone)
                    }
                }}
                style={{ cursor: 'pointer' }}
                >
              <span className="tx-desc">
                {formatPhone(p.phone)} - {dataAmount}
              </span>
              <span className="tx-provider">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: PROVIDER_COLORS[provider] || '#666',
                  }}
                />
                {PROVIDER_LABELS[provider] || p.provider}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}