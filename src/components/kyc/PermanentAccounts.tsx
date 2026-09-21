// src/components/kyc/PermanentAccounts.tsx
import { useState } from 'react'
import { toast } from '@/stores/toastStore'
import type { KYCBankAccount } from '@/lib/addMoneyStorage'

interface PermanentAccountsProps {
  accounts: KYCBankAccount[]
  showVerifiedBadge?: boolean
}

interface BankMeta {
  logo: string
  logoFallback: string
  accent: string
}

const BANK_META: Record<string, BankMeta> = {
  '9psb': {
    logo: '/frontend/img/9PSB.png',
    logoFallback: '9P',
    accent: '#0077ff',
  },
  '9psp': {
    logo: '/frontend/img/9PSB.png',
    logoFallback: '9P',
    accent: '#0077ff',
  },
  '9 payment': {
    logo: '/frontend/img/9PSB.png',
    logoFallback: '9P',
    accent: '#0077ff',
  },
  palmpay: {
    logo: '/frontend/img/palmpay.png',
    logoFallback: 'PP',
    accent: '#00c853',
  },
  'palm pay': {
    logo: '/frontend/img/palmpay.png',
    logoFallback: 'PP',
    accent: '#00c853',
  },
}

function getBankMeta(bankName: string): BankMeta {
  const key = (bankName || '').toLowerCase().replace(/\s+/g, '')
  return (
    BANK_META[key] || {
      logo: '',
      logoFallback: (bankName || 'BK').substring(0, 2).toUpperCase(),
      accent: '#6366f1',
    }
  )
}

export default function PermanentAccounts({
  accounts,
  showVerifiedBadge = false,
}: PermanentAccountsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const handleCopy = async (accountNumber: string, bankName: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(accountNumber)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = accountNumber
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopiedIdx(idx)
    toast.success(`${bankName} — ${accountNumber} copied!`)
    window.setTimeout(() => setCopiedIdx(null), 1800)
  }

  if (accounts.length === 0) {
    return (
      <div className="fg-perm-empty">
        No accounts found. Please contact support.
      </div>
    )
  }

  return (
    <div className="fg-perm-wrap">
      {showVerifiedBadge && (
        <div className="fg-perm-verified">
          <div className="fg-perm-verified-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="fg-perm-verified-text">
            <div className="fg-perm-verified-title">KYC Verified!</div>
            <div className="fg-perm-verified-sub">
              Your permanent accounts are ready
            </div>
          </div>
          <div className="fg-perm-verified-badge">Permanent</div>
        </div>
      )}

      <div className="fg-perm-list">
        {accounts.map((acct, idx) => {
          const meta = getBankMeta(acct.bankName)
          const isCopied = copiedIdx === idx

          return (
            <div
              key={`${acct.accountNumber}-${idx}`}
              className="fg-perm-card"
              style={{ ['--accent' as string]: meta.accent }}
            >
              <div className="fg-perm-card-glow" aria-hidden />

              <div className="fg-perm-card-top">
                <div className="fg-perm-logo">
                  {meta.logo ? (
                    <>
                      <img
                        src={meta.logo}
                        alt={acct.bankName}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const sib = e.currentTarget
                            .nextElementSibling as HTMLElement | null
                          if (sib) sib.style.display = 'flex'
                        }}
                      />
                      <div className="fg-perm-logo-fallback">
                        {meta.logoFallback}
                      </div>
                    </>
                  ) : (
                    <div
                      className="fg-perm-logo-fallback"
                      style={{ display: 'flex' }}
                    >
                      {meta.logoFallback}
                    </div>
                  )}
                </div>
                <div className="fg-perm-bank-block">
                  <div className="fg-perm-label">Bank</div>
                  <div className="fg-perm-bank-name">{acct.bankName}</div>
                </div>
              </div>

              <div className="fg-perm-name-block">
                <div className="fg-perm-label">Account Name</div>
                <div className="fg-perm-name">
                  {acct.accountName || 'Flexgig Digital Network'}
                </div>
              </div>

              <div className="fg-perm-number-block">
                <div className="fg-perm-label">Account Number</div>
                <div className="fg-perm-number-row">
                  <span className="fg-perm-number">
                    {acct.accountNumber}
                  </span>
                  <button
                    type="button"
                    className={`fg-perm-copy${isCopied ? ' copied' : ''}`}
                    aria-label="Copy account number"
                    onClick={() =>
                      handleCopy(acct.accountNumber, acct.bankName, idx)
                    }
                  >
                    {isCopied ? (
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 11C6 8.17 6 6.76 6.88 5.88C7.76 5 9.17 5 12 5H15C17.83 5 19.24 5 20.12 5.88C21 6.76 21 8.17 21 11V16C21 18.83 21 20.24 20.12 21.12C19.24 22 17.83 22 15 22H12C9.17 22 7.76 22 6.88 21.12C6 20.24 6 18.83 6 16V11Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          opacity="0.5"
                          d="M6 19C4.34 19 3 17.66 3 16V10C3 6.23 3 4.34 4.17 3.17C5.34 2 7.23 2 11 2H15C16.66 2 18 3.34 18 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fg-perm-note">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" />
          <path
            d="M12 8v4m0 4h.01"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div>
          These accounts are <strong>permanently assigned</strong> to you.
          Transfers reflect in your wallet <strong>instantly</strong> with no
          processing fees.
        </div>
      </div>
    </div>
  )
}