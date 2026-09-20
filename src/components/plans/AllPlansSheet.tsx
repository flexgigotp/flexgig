import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { usePlans } from '@/hooks/usePlans'
import type { DataPlan } from '@/types/api'
import {
  plansForProvider,
  groupPlansByCategory,
  getSpecialPlanState,
  specialStateLabel,
  formatPlanPrice,
} from '@/lib/plans'
import PlanDataDisplay from './PlanDataDisplay'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface AllPlansSheetProps {
  provider: string
  selectedPlanId?: string | null
  onClose: () => void
  onSelect: (plan: DataPlan) => void
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'GLO',
  ninemobile: '9MOBILE',
}

export default function AllPlansSheet({
  provider,
  selectedPlanId,
  onClose,
  onSelect,
}: AllPlansSheetProps) {
  const { plans, isLoading } = usePlans()

  const providerPlans = useMemo(
    () => plansForProvider(plans, provider),
    [plans, provider]
  )

  const sections = useMemo(
    () => groupPlansByCategory(providerPlans),
    [providerPlans]
  )

  const providerLabel = PROVIDER_LABELS[provider.toLowerCase()] || provider
  const providerClass = provider.toLowerCase()

  // ── Auto-scroll to the currently selected plan ────────────────────
  useEffect(() => {
    if (!selectedPlanId || isLoading) return
    // Wait one frame so the portal content is mounted & laid out
    const timer = window.setTimeout(() => {
      const el = document.querySelector(
        `.fg-allplans-grid .plan-box[data-plan-id="${selectedPlanId}"]`
      )
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [selectedPlanId, isLoading])
  useBodyScrollLock(true)

  return createPortal(
    <div
      className="fg-allplans-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="fg-allplans-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`All ${providerLabel} plans`}
      >
        <div className="fg-allplans-handle" aria-hidden />

        <header className="fg-allplans-header">
          <h2 className="fg-allplans-title">{providerLabel} Plans</h2>
          <button
            type="button"
            className="fg-allplans-close"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="fg-allplans-body">
          {isLoading && sections.length === 0 && (
            <p className="fg-allplans-empty">Loading plans…</p>
          )}

          {!isLoading && sections.length === 0 && (
            <p className="fg-allplans-empty">
              No plans available for {providerLabel} right now.
            </p>
          )}

          {sections.map((section) => (
            <section key={section.key} className="fg-plan-section">
              <div className="fg-plan-section-header">
                <span
                className={`fg-plan-section-dot fg-plan-section-dot--${providerClass}`}
                aria-hidden
                />
                <h3 className="fg-plan-section-title">
                  {providerLabel} {section.label}
                </h3>
              </div>

              <div className="fg-allplans-grid">
                {section.plans.map((plan) => {
                  const categoryUpper = (plan.category || '').toUpperCase()
                  const showTag =
                    categoryUpper &&
                    !['STANDARD', 'NORMAL'].includes(categoryUpper)

                  const isSpecial = section.key === 'SPECIAL'
                  const specialState = isSpecial
                    ? getSpecialPlanState(plan)
                    : 'available'
                  const soldOut = isSpecial && specialState !== 'available'
                  const isSelected = plan.plan_id === selectedPlanId

                  return (
                    <div
                      key={plan.plan_id}
                      data-plan-id={plan.plan_id}
                      className={[
                        'plan-box',
                        providerClass,
                        isSelected ? 'selected' : '',
                        soldOut ? 'sold-out' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="button"
                      tabIndex={soldOut ? -1 : 0}
                      aria-disabled={soldOut}
                      onClick={() => !soldOut && onSelect(plan)}
                      onKeyDown={(e) => {
                        if (
                          !soldOut &&
                          (e.key === 'Enter' || e.key === ' ')
                        ) {
                          onSelect(plan)
                        }
                      }}
                      style={
                        soldOut
                          ? {
                              opacity: 0.55,
                              cursor: 'not-allowed',
                              pointerEvents: 'none',
                            }
                          : undefined
                      }
                    >
                      {isSpecial && (
                        <div className="remaining-count">
                          {specialStateLabel(specialState)}
                        </div>
                      )}

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
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}