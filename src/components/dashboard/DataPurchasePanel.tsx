import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '@/hooks/usePlans'
import { useDataPurchaseStore } from '@/stores/dataPurchaseStore'
import PlanDataDisplay from '@/components/plans/PlanDataDisplay'
import {
  PROVIDERS,
  detectProvider,
  formatNgPhone,
  normalizeNgPhone,
  isValidNgPhone,
  type ProviderId,
} from '@/lib/providers'
import {
  plansForProvider,
  pickPreviewPlans,
  formatPlanPrice,
} from '@/lib/plans'

const FOCUS_DELAY_MS = 40
const MAX_PHONE_DIGITS = 11
const BARE_PHONE_PREFIX = /^(70|80|81|90|91|71)/
const UNTAGGED_CATEGORIES = ['STANDARD', 'NORMAL']

export default function DataPurchasePanel() {
  const navigate = useNavigate()
  const { plans, isLoading } = usePlans()

  const phone = useDataPurchaseStore((s) => s.phone)
  const provider = useDataPurchaseStore((s) => s.provider)
  const selectedPlanId = useDataPurchaseStore((s) => s.planId)
  const previewOrder = useDataPurchaseStore((s) => s.previewOrder)
  const setPhone = useDataPurchaseStore((s) => s.setPhone)
  const setProvider = useDataPurchaseStore((s) => s.setProvider)
  const selectPlanInPlace = useDataPurchaseStore((s) => s.selectPlanInPlace)

  const phoneRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const boxRefs = useRef<Record<ProviderId, HTMLDivElement | null>>({
    mtn: null,
    airtel: null,
    glo: null,
    ninemobile: null,
  })

  // ── Navigation ────────────────────────────────────────────────────
  const openPlans = useCallback(
    (p: ProviderId) => {
      const params = new URLSearchParams(window.location.search)
      params.set('plans', '1')
      params.set('plans_provider', p)
      navigate(`/dashboard?${params.toString()}`)
    },
    [navigate]
  )

  const handleContinue = useCallback(() => {
    const selected = plansForProvider(plans, provider).find(
      (p) => p.plan_id === selectedPlanId
    )
    if (!selected) return

    const cleaned = normalizeNgPhone(phone)
    if (!isValidNgPhone(cleaned)) return

    const params = new URLSearchParams({
      checkout: '1',
      plan_id: selected.plan_id,
      phone: cleaned,
      provider: provider.toUpperCase(),
    })
    navigate(`/dashboard?${params.toString()}`)
  }, [navigate, plans, phone, provider, selectedPlanId])

  // ── Derived provider info ─────────────────────────────────────────
  const currentProviderInfo = useMemo(
    () => PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0],
    [provider]
  )

  // ── Auto-detect provider from phone number ────────────────────────
  useEffect(() => {
    const digits = normalizeNgPhone(phone)
    if (digits.length < 4) return

    const detected = detectProvider(digits)
    if (detected && detected !== provider) {
      setProvider(detected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])

  // ── Auto-blur once the number reaches full length ─────────────────
  useEffect(() => {
    const digits = normalizeNgPhone(phone)
    if (digits.length !== MAX_PHONE_DIGITS) return

    const t = window.setTimeout(
      () => phoneRef.current?.blur(),
      FOCUS_DELAY_MS
    )
    return () => window.clearTimeout(t)
  }, [phone])

  // ── Sliding provider indicator ────────────────────────────────────
  const positionSlider = useCallback(
    (animate: boolean) => {
      const slider = sliderRef.current
      const grid = gridRef.current
      const box = boxRefs.current[provider]
      if (!slider || !grid || !box) return

      const boxRect = box.getBoundingClientRect()
      const gridRect = grid.getBoundingClientRect()

      if (!animate) slider.style.transition = 'none'

      slider.style.width = `${boxRect.width}px`
      slider.style.height = `${boxRect.height}px`
      slider.style.left = `${boxRect.left - gridRect.left}px`
      slider.style.top = `${boxRect.top - gridRect.top}px`

      if (!animate) {
        void slider.offsetWidth
        slider.style.transition = ''
      }
    },
    [provider]
  )

  useLayoutEffect(() => {
    positionSlider(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    positionSlider(true)
  }, [positionSlider])

  useEffect(() => {
    const handleResize = () => positionSlider(false)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [positionSlider])

  // ── Phone input handlers ──────────────────────────────────────────
  const handlePhoneChange = (raw: string) => {
    let digits = raw.replace(/\D/g, '')
    if (digits.startsWith('234')) digits = '0' + digits.slice(3)
    if (digits.length === 1 && /^[789]$/.test(digits)) digits = '0' + digits
    if (digits.length === 10 && BARE_PHONE_PREFIX.test(digits)) {
      digits = '0' + digits
    }
    if (digits.length > MAX_PHONE_DIGITS) {
      digits = digits.slice(0, MAX_PHONE_DIGITS)
    }
    setPhone(digits)
  }

  const handleClear = () => {
    setPhone('')
    window.setTimeout(() => phoneRef.current?.focus(), FOCUS_DELAY_MS)
  }

  const handleContactPick = async () => {
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts: { multiple: boolean }
        ) => Promise<Array<{ tel?: string[] }>>
      }
    }

    const isSupported = 'contacts' in navigator && 'ContactsManager' in window
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isSecure = window.location.protocol === 'https:'

    if (!isSecure) {
      alert('Contact picker requires HTTPS.')
      return
    }
    if (!isSupported || !nav.contacts) {
      alert('Contact picker is not supported on this browser.')
      return
    }
    if (!isAndroid) {
      alert('Contact picker is only supported on Android.')
      return
    }

    try {
      const contacts = await nav.contacts.select(['tel'], { multiple: false })
      const raw = contacts?.[0]?.tel?.[0]
      if (!raw) return
      handlePhoneChange(raw)
    } catch (err) {
      console.error('[contacts]', err)
    }
  }

  // ── Derived plan data ─────────────────────────────────────────────
  const providerPlans = useMemo(
    () => plansForProvider(plans, provider),
    [plans, provider]
  )

  const previewPlans = useMemo(
    () => pickPreviewPlans(providerPlans, provider),
    [providerPlans, provider]
  )

  // Preview order: read from previewOrder (persisted), filter to this
  // provider, slice to 2, and fill any empty slots from the default preview.
  const displayPlans = useMemo(() => {
    const ordered = previewOrder
      .map((id) => providerPlans.find((p) => p.plan_id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .slice(0, 2)

    if (ordered.length < 2) {
      const defaults = previewPlans.filter(
        (p) => !ordered.some((o) => o.plan_id === p.plan_id)
      )
      ordered.push(...defaults.slice(0, 2 - ordered.length))
    }

    return ordered
  }, [previewOrder, providerPlans, previewPlans])

  const selectedPlan = useMemo(
    () => providerPlans.find((p) => p.plan_id === selectedPlanId) ?? null,
    [providerPlans, selectedPlanId]
  )

  const cleanedPhone = normalizeNgPhone(phone)
  const phoneValid = isValidNgPhone(cleanedPhone)
  const canContinue = phoneValid && selectedPlan !== null
  const hasPhone = phone.length > 0

  const handleSelectProvider = (id: ProviderId) => {
    setProvider(id)
  }

  const handleSelectPlan = (planId: string) => {
  selectPlanInPlace(planId)
}

  return (
    <div className="data-purchase-panel">
      {/* ── Phone Number ────────────────────────────────────── */}
      <div className="phone-section">
        <p style={{ fontSize: 'small' }}>Phone Number</p>
        <div className="phone-input-row">
          <input
            ref={phoneRef}
            type="tel"
            className="phone-input"
            inputMode="tel"
            placeholder="Enter phone number"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            value={formatNgPhone(phone)}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onKeyDown={(e) => {
              const allowed = [
                'Backspace',
                'Delete',
                'ArrowLeft',
                'ArrowRight',
                'Tab',
                'Enter',
                'Home',
                'End',
              ]
              if (
                (e.ctrlKey || e.metaKey) &&
                ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())
              ) {
                return
              }
              if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                e.preventDefault()
              }
            }}
            onPaste={(e) => {
              e.preventDefault()
              handlePhoneChange(e.clipboardData.getData('text'))
            }}
          />

          {hasPhone ? (
            <button
              type="button"
              className="contact-btn"
              aria-label="Clear number"
              onClick={handleClear}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#bfc7d3" />
                <path
                  d="M8 8l8 8M16 8l-8 8"
                  stroke="#021827"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="contact-btn"
              aria-label="Pick from contacts"
              onClick={handleContactPick}
            >
              <img
                src="/frontend/svg/contact-icon.svg"
                alt=""
                style={{ width: 20, height: 20, display: 'block' }}
              />
            </button>
          )}
        </div>
      </div>

      {/* ── Network Provider ─────────────────────────────────── */}
      <div className="network-provider">
        <p style={{ fontSize: 'small' }}>Network Provider</p>
        <div className="provider-grid" ref={gridRef}>
          <div
            ref={sliderRef}
            className={`fg-provider-slider ${provider}`}
            aria-hidden
          >
            <img src={currentProviderInfo.img} alt="" />
            <div className="fg-slider-name">{currentProviderInfo.label}</div>
          </div>

          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              ref={(el) => {
                boxRefs.current[p.id] = el
              }}
              className={`provider-box ${p.id}`}
              role="button"
              tabIndex={0}
              aria-selected={provider === p.id}
              onClick={() => handleSelectProvider(p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectProvider(p.id)
                }
              }}
            >
              <img src={p.img} alt={p.label} />
              <div className="provider-name">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subscription Plan ────────────────────────────────── */}
      <div className="subscription-plan">
        <p style={{ fontSize: 'small' }}>Subscription Plan</p>
      </div>

      <div className="plans-row">
        {isLoading && displayPlans.length === 0 && (
          <div
            className="plan-box"
            style={{ opacity: 0.4, pointerEvents: 'none' }}
          >
            <div className="plan-data">Loading…</div>
          </div>
        )}

        {displayPlans.map((plan) => {
          const isSelected = selectedPlanId === plan.plan_id
          const categoryUpper = plan.category?.toUpperCase() || ''
          const showTag =
            categoryUpper && !UNTAGGED_CATEGORIES.includes(categoryUpper)

          return (
            <div
              key={plan.plan_id}
              className={`plan-box ${provider}${
                isSelected ? ' selected' : ''
              }`}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectPlan(plan.plan_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectPlan(plan.plan_id)
                }
              }}
            >
              <div className="plan-amount">
                {formatPlanPrice(plan.price)}
              </div>
              <div className="plan-data">
                <PlanDataDisplay dataAmount={plan.data_amount} />
              </div>
              <div className="plan-days">{plan.duration}</div>
              {showTag && (
                <div className="plan-type-tag">{categoryUpper}</div>
              )}
            </div>
          )
        })}

        <div
          className="see-all-plans"
          role="button"
          tabIndex={0}
          onClick={() => openPlans(provider)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              openPlans(provider)
            }
          }}
        >
          <img
            style={{ width: 50, height: 50 }}
            src="/frontend/svg/plane.svg"
            alt="all plans"
          />
          <span>All Plans</span>
        </div>
      </div>

      <button
        className={`continue-btn${canContinue ? ' active' : ''}`}
        disabled={!canContinue}
        onClick={handleContinue}
      >
        Continue
      </button>
    </div>
  )
}