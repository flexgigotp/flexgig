interface DashboardActionCardsProps {
  hasPin: boolean
  profileCompleted: boolean
  onSetupPin?: () => void
  onUpdateProfile?: () => void
}

export default function DashboardActionCards({
  hasPin,
  profileCompleted,
  onSetupPin,
  onUpdateProfile,
}: DashboardActionCardsProps) {
  if (hasPin && profileCompleted) return null

  return (
    <>
      {!hasPin && (
        <div
          className="card pin"
          role="button"
          aria-haspopup="dialog"
          tabIndex={0}
          onClick={onSetupPin}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSetupPin?.()
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="icon-wrap" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L4 5v6c0 5.25 3.84 9.74 8 11 4.16-1.26 8-5.75 8-11V5l-8-3z"
                  fill="#FFD700"
                  opacity="0.95"
                />
                <rect x="9" y="10" width="6" height="5" rx="1" fill="#021827" />
              </svg>
            </div>
            <div>
              <h4>Setup Pin</h4>
              <p>Secure your account</p>
            </div>
          </div>
          <svg
            className="arrow-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M9 18l6-6-6-6"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {!profileCompleted && (
        <div
          className="card update-profile"
          role="button"
          aria-haspopup="dialog"
          tabIndex={0}
          onClick={onUpdateProfile}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onUpdateProfile?.()
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="icon-wrap" aria-hidden>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
              >
                <defs>
                  <linearGradient id="gradProfile" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff6a00" stopOpacity="1" />
                    <stop offset="50%" stopColor="#ee0979" stopOpacity="1" />
                    <stop offset="100%" stopColor="#8e2de2" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#gradProfile)"
                  d="M12 12c2.67 0 8 1.34 8 4v2H4v-2c0-2.66 5.33-4 8-4zm0-2a4 4 0 100-8 4 4 0 000 8z"
                />
              </svg>
            </div>
            <div>
              <h4>Update Profile</h4>
              <p>Keep your account details up to date</p>
            </div>
          </div>
          <svg
            className="arrow-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M9 18l6-6-6-6"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </>
  )
}