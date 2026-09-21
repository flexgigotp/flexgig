// src/components/plans/PlanDataDisplay.tsx
interface PlanDataDisplayProps {
  dataAmount: string
}

/**
 * Renders a plan's data amount, splitting any "+ X" bonus into a small badge.
 * "2.6GB + 1.5GB Night" → "2.6GB" (main) + "+1.5GB Night" (badge below)
 */
export default function PlanDataDisplay({ dataAmount }: PlanDataDisplayProps) {
  if (!dataAmount) return null

  const match = String(dataAmount).match(/^(.+?)\s*\+\s*(.+)$/)

  if (!match) {
    return <span className="plan-data-main">{dataAmount}</span>
  }

  const [, main, bonus] = match
  return (
    <>
      <span className="plan-data-main">{main.trim()}</span>
      <span className="plan-bonus-badge">+{bonus.trim()}</span>
    </>
  )
}