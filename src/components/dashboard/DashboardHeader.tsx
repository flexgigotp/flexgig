interface DashboardHeaderProps {
  username?: string
  firstName?: string
  fullName?: string
  avatarUrl?: string
}

export default function DashboardHeader({
  username,
  firstName,
  fullName,
  avatarUrl,
}: DashboardHeaderProps) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  // Match the live site: username wins, then firstName, then first word of fullName
  const rawName =
    username ||
    firstName ||
    (fullName ? fullName.split(' ')[0] : '') ||
    'User'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header>
      <div className="user-info">
        <div className="avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="avatar-img" />
          ) : (
            initial
          )}
        </div>
        <div className="greeting">
          <span>{greeting}</span>
          <strong>{displayName}</strong>
        </div>
      </div>
      <a
        href="https://wa.me/message/4LVAARGNFNLZP1"
        target="_blank"
        rel="noopener noreferrer"
        className="support"
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3C7.03 3 3 6.92 3 12c0 1.87.51 3.62 1.39 5.11L3 21l4.07-1.46A8.96 8.96 0 0 0 12 21c4.97 0 9-3.92 9-9s-4.03-9-9-9z" />
        </svg>
        <span>Support</span>
      </a>
    </header>
  )
}