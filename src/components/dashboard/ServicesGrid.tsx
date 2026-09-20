interface ServiceItem {
  id: string
  label: string
  color: string
  icon: string
}

const services: ServiceItem[] = [
  { id: 'data', label: 'Data', color: '#00AAFF', icon: 'M4 12h2v6H4zM9 8h2v10H9zM14 5h2v13h-2zM19 3h2v15h-2z' },
  { id: 'airtime', label: 'Airtime', color: '#FFD700', icon: 'M7 2h10l3 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4l3-2zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
  { id: 'electricity', label: 'Electricity', color: '#FFAA00', icon: 'M13 2L3 14h7v8l10-12h-7z' },
  { id: 'tv', label: 'TV', color: '#7F5FFF', icon: 'M3 4h18v12H3zM8 20h8v-2H8z' },
  { id: 'convert', label: 'Convert', color: '#00DD88', icon: 'M7 7h10v3l4-4-4-4v3H7v4zM17 17H7v-3l-4 4 4 4v-3h10v-4z' },
  { id: 'giftcards', label: 'Giftcards', color: '#FF6A3D', icon: 'M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7h16zM12 3l2 3h4l-2 3H8L6 6h4l2-3z' },
]

// For now Data is the only enabled service — the rest are coming soon
const ACTIVE_SERVICE = 'data'

export default function ServicesGrid() {
  return (
    <div className="shortcuts">
      <h4>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 12h18M3 6h18M3 18h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Services
      </h4>
      <div className="short-grid">
        {services.map((s) => {
          const isActive = s.id === ACTIVE_SERVICE
          const isComingSoon = s.id !== 'data'
          return (
            <div
              key={s.id}
              className={`short-item${isActive ? ' active' : ''}${isComingSoon ? ' coming-soon' : ''}`}
              data-shortcut={s.id}
            >
              <svg width="36" height="36" fill={s.color} viewBox="0 0 24 24">
                <path d={s.icon} />
              </svg>
              <small>{s.label}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}