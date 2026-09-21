interface QuickActionsProps {
  onTransfer?: () => void
  onAddMoney?: () => void
}

export default function QuickActions({
  onTransfer,
  onAddMoney,
}: QuickActionsProps) {
  return (
    <div className="actions-row">
      <div
        className="card transfer"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={onTransfer}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onTransfer?.()
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V5m-5 5l5-5 5 5"
                stroke="#FFD700"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h4>Transfer</h4>
          </div>
        </div>
      </div>

      <div
        className="card add-money"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={onAddMoney}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onAddMoney?.()
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V5m-7 7h14"
                stroke="#00AAFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h4>Add Money</h4>
          </div>
        </div>
      </div>
    </div>
  )
}