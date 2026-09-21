// src\components\dashboard\AllTimeStats.tsx

interface AllTimeStatsProps {
  funded?: number
  spent?: number
  count?: number
}

export default function AllTimeStats({
  funded = 0,
  spent = 0,
  count = 0,
}: AllTimeStatsProps) {
  const fmt = (n: number) =>
    `₦${n.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <div className="alltime-activity-card">
      <h4 className="alltime-card-title">All-Time Activity</h4>
      <div className="alltime-stats-grid-layout">
        <div className="alltime-stat-block">
          <span className="alltime-stat-label">Total Funded</span>
          <span className="alltime-stat-value incoming-highlight">
            {fmt(funded)}
          </span>
        </div>
        <div className="alltime-stat-block">
          <span className="alltime-stat-label">Total Spent</span>
          <span className="alltime-stat-value outgoing-highlight">
            {fmt(spent)}
          </span>
        </div>
        <div className="alltime-stat-block">
          <span className="alltime-stat-label">Total Transactions Made</span>
          <span className="alltime-stat-value neutral-count">{count}</span>
        </div>
      </div>
    </div>
  )
}