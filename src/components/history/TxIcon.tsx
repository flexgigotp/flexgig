// src/components/history/TxIcon.tsx
import type { Transaction } from '@/types/api'
import { statusKind } from '@/lib/history'

interface TxIconProps {
  tx: Transaction
}

/**
 * Mirrors the vanilla history.js getTxIcon()/makeTxNode() output:
 *
 *   <div class="tx-icon ${cls}">
 *     <div class="tx-svg"><img class="tx-img" src="..." /></div>   ← when img
 *     OR
 *     <svg class="tx-arrow up|down">...</svg>                       ← fallback
 *   </div>
 *
 * All sizing + background comes from the existing dashboard.css
 * (.tx-icon.mtn.targets, .tx-icon.incoming, etc.). Do not inline styles.
 */
export default function TxIcon({ tx }: TxIconProps) {
  const kind = statusKind(tx.status)

  // Match the fields the vanilla concatenated into one text blob
  const text = [
    tx.description,
    tx.provider,
    (tx as unknown as { narration?: string }).narration,
    (tx as unknown as { service?: string }).service,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const isCredit = tx.type === 'credit'

  let cls: string
  let img: string | null = null
  let alt = ''

  if (kind === 'refund') {
    cls = 'refund incoming'
    img = '/frontend/svg/refund.svg'
    alt = 'Refund'
  } else if (
    text.includes('refunded to admin') ||
    text.includes('advance repaid by')
  ) {
    cls = isCredit ? 'incoming' : 'outgoing'
  } else if (text.includes('funding')) {
    cls = 'incoming'
    img = '/frontend/svg/bank.svg'
    alt = 'Bank'
  } else if (text.includes('mtn')) {
    cls = 'mtn targets'
    img = '/public/frontend/img/mtn.png' // ← vanilla uses /img/, not /svg/
    alt = 'MTN'
  } else if (text.includes('airtel')) {
    cls = 'airtel targets'
    img = '/frontend/svg/airtel-icon.svg'
    alt = 'Airtel'
  } else if (text.includes('glo')) {
    cls = 'glo targets'
    img = '/frontend/svg/GLO-icon.svg'
    alt = 'GLO'
  } else if (
    text.includes('9mobile') ||
    text.includes('etisalat') ||
    text.includes('nine')
  ) {
    cls = 'nine-mobile targets'
    img = '/frontend/svg/9mobile-icon.svg'
    alt = '9Mobile'
  } else {
    // Wallet transfers, wallet credits, any other tx → generic arrows
    cls = isCredit ? 'incoming' : 'outgoing'
  }

  return (
    <div className={`tx-icon ${cls}`} aria-hidden="true">
      {img ? (
        <div className="tx-svg" aria-hidden="true">
          <img className="tx-img" src={img} alt={alt} />
        </div>
      ) : isCredit ? (
        <svg
          className="tx-arrow down"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      ) : (
        <svg
          className="tx-arrow up"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      )}
    </div>
  )
}