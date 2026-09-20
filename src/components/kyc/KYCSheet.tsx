// src/components/kyc/KYCSheet.tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { kycApi, extractApiError } from '@/services/api'
import {
  getKYCState,
  saveKYCState,
  type KYCBankAccount,
} from '@/lib/addMoneyStorage'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import Loader from '@/components/Loader'
import { toast } from '@/stores/toastStore'
import PermanentAccounts from './PermanentAccounts'

interface KYCSheetProps {
  onClose: () => void
}

type Step = 'form' | 'accounts'
type IDType = 'BVN' | 'NIN'

interface ServerAccount {
  account_number?: string
  account_name?: string | null
  bank_name?: string
  bank_code?: string | null
  currency?: string
  accountNumber?: string
  accountName?: string | null
  bankName?: string
  bankCode?: string | null
}

function normalizeAccounts(raw: ServerAccount[]): KYCBankAccount[] {
  return raw.map((a) => ({
    accountNumber: a.account_number || a.accountNumber || '',
    accountName: a.account_name ?? a.accountName ?? null,
    bankName: a.bank_name || a.bankName || '',
    bankCode: a.bank_code ?? a.bankCode ?? null,
    currency: a.currency || 'NGN',
  }))
}

export default function KYCSheet({ onClose }: KYCSheetProps) {
  const [step, setStep] = useState<Step>('form')
  const [idType, setIdType] = useState<IDType>('BVN')
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVerifiedBadge, setShowVerifiedBadge] = useState(false)
  const [accounts, setAccounts] = useState<KYCBankAccount[]>(() => {
    const s = getKYCState()
    return s?.verified && s.accounts.length > 0 ? s.accounts : []
  })

  useBodyScrollLock(true)
  const syncedRef = useRef(false)

  // If we already have accounts cached, jump straight to accounts view.
  useEffect(() => {
    if (accounts.length > 0) setStep('accounts')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Otherwise, ask the server once (fresh devices / cleared cache).
  useEffect(() => {
    if (syncedRef.current) return
    syncedRef.current = true
    if (accounts.length > 0) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await kycApi.getAccounts()
        if (cancelled) return
        if (
          res.kycStatus === 'verified' &&
          Array.isArray(res.accounts) &&
          res.accounts.length > 0
        ) {
          const normalized = normalizeAccounts(res.accounts)
          saveKYCState(normalized)
          setAccounts(normalized)
          setStep('accounts')
        }
      } catch {
        /* offline — form still works */
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
  setError(null)

  if (!/^\d{11}$/.test(value)) {
    setError(`Please enter a valid 11-digit ${idType}.`)
    return
  }

  setSubmitting(true)
  try {
    const res = await kycApi.submit(idType, value)

    const rawAccounts = Array.isArray(res.accounts) ? res.accounts : []
    const normalized = normalizeAccounts(rawAccounts as ServerAccount[])

    // Any accounts returned (success OR partial) → show them.
    if (normalized.length > 0) {
      saveKYCState(normalized)
      setAccounts(normalized)

      // Celebratory banner only on a clean first-time success
      const isCleanSuccess = res.ok === true && !res.alreadyVerified
      setShowVerifiedBadge(isCleanSuccess)
      setStep('accounts')

      if (isCleanSuccess) {
        toast.success('KYC verified — accounts ready')
      } else if (res.alreadyVerified) {
        // Silent — user was already verified
      } else {
        // Partial — show what we got, tell user to retry for the rest
        toast.info(
          res.message ||
            'One account could not be provisioned. Please try again.'
        )
      }
      return
    }

    // No accounts returned → surface the error
    setError(
      res.message ||
        `Your ${idType} could not be verified. Please double-check and try again.`
    )
  } catch (err) {
    const { message, code } = extractApiError(err)
    if (code === 'PROFILE_INCOMPLETE') {
      setError(
        message ||
          'Please complete your profile (name, username, phone) first.'
      )
    } else if (code === 'INVALID_IDENTITY') {
      setError(
        message ||
          `Your ${idType} could not be verified. Please double-check and try again.`
      )
    } else {
      setError(message || 'Verification failed. Please try again.')
    }
  } finally {
    setSubmitting(false)
  }
}

  const handleInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    setValue(digits)
    if (error) setError(null)
  }

  const hint =
    idType === 'BVN'
      ? 'Your 11-digit BVN — dial *565*0# on any network to retrieve it.'
      : 'Your 11-digit NIN — check your NIN slip or dial *346# to retrieve it.'

  return createPortal(
    <div className="kyc-modal-overlay">
      <div className="kyc-modal-sheet">
        <div className="kyc-modal-header">
          <button
            type="button"
            className="kyc-back-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h3 className="kyc-modal-title">
            {step === 'form' ? 'Complete KYC' : 'Add Money'}
          </h3>
          <div style={{ width: 38 }} />
        </div>

        <div className="kyc-modal-divider" />

        <div className="kyc-modal-body">
          {step === 'form' && (
            <>
              <div className="kyc-info-banner">
                <div className="kyc-info-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                      stroke="#00AAFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="kyc-info-text">
                  <div className="kyc-info-title">Why do we need this?</div>
                  <p className="kyc-info-desc">
                    Verifying with your <strong>BVN</strong> or{' '}
                    <strong>NIN</strong> unlocks a permanent personal bank
                    account, higher deposit limits, and keeps your wallet
                    secure — as required by the CBN.
                  </p>
                </div>
              </div>

              <div className="kyc-type-section">
                <div className="kyc-section-label">Select ID type</div>
                <div className="kyc-type-btns">
                  <button
                    type="button"
                    className={`kyc-type-btn${
                      idType === 'BVN' ? ' kyc-type-btn--active' : ''
                    }`}
                    onClick={() => {
                      setIdType('BVN')
                      setValue('')
                      setError(null)
                    }}
                    disabled={submitting}
                  >
                    BVN
                  </button>
                  <button
                    type="button"
                    className={`kyc-type-btn${
                      idType === 'NIN' ? ' kyc-type-btn--active' : ''
                    }`}
                    onClick={() => {
                      setIdType('NIN')
                      setValue('')
                      setError(null)
                    }}
                    disabled={submitting}
                  >
                    NIN
                  </button>
                </div>
              </div>

              <div className="kyc-input-section">
                <label className="kyc-input-label">
                  Enter your {idType}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  className={`kyc-number-input${error ? ' kyc-number-input--error' : ''}`}
                  placeholder="e.g. 12345678901"
                  value={value}
                  onChange={(e) => handleInputChange(e.target.value)}
                  disabled={submitting}
                />
                <div
                  className={`kyc-input-hint${
                    error ? ' kyc-input-hint--error' : ''
                  }`}
                >
                  {error || hint}
                </div>
              </div>

              <button
                type="button"
                className="kyc-submit-btn"
                onClick={handleSubmit}
                disabled={submitting || value.length !== 11}
              >
                Submit {idType}
              </button>
            </>
          )}

          {step === 'accounts' && (
            <PermanentAccounts
              accounts={accounts}
              showVerifiedBadge={showVerifiedBadge}
            />
          )}
        </div>

        {submitting && <Loader transparent />}
      </div>
    </div>,
    document.body
  )
}