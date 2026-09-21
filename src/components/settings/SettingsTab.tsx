// src/components/settings/SettingsTab.tsx
import { createPortal } from 'react-dom'
import { useSession } from '@/hooks'

interface SettingsTabProps {
  onClose: () => void
  onOpenHelp: () => void
  onOpenSecurity: () => void
  onOpenReferrals: () => void
  onOpenEditProfile: () => void
  onLogout: () => void
}

export default function SettingsTab({
  onClose,
  onOpenHelp,
  onOpenSecurity,
  onOpenReferrals,
  onOpenEditProfile,
  onLogout,
}: SettingsTabProps) {
  const { user } = useSession()

  const avatarUrl = user?.profilePicture
  const displayName =
    user?.username || user?.fullName || user?.firstName || 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const email = user?.email || ''

  return createPortal(
    <div
      className="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settingsTitle"
    >
      <div className="settings-content">
        {/* ── Header (matches live: back chevron + centered "Settings") ── */}
        <div className="settings-header all-modal-headers">
          <button
            type="button"
            className="settings-back all-modal-chevron"
            aria-label="Back to dashboard"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h3 id="settingsTitle" className="settings-title all-modal-title">
            Settings
          </h3>
        </div>

        <div className="settings-divider" />

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="settings-body">
          {/* Profile card */}
          <div className="settings-profile">
            <div className="settings-profile-main">
              <div className="settings-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} />
                ) : (
                  initial
                )}
              </div>
              <div className="settings-profile-info">
                <div className="settings-username">{displayName}</div>
                <div className="settings-email">{email}</div>
              </div>
            </div>

            <button
              type="button"
              className="settings-edit"
              onClick={onOpenEditProfile}
            >
              <span>Edit profile</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                  fill="currentColor"
                />
                <path
                  d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Menu items */}
          <div className="settings-blocks">
            {/* Help & Support — headset icon */}
            <button
              type="button"
              className="settings-item"
              onClick={onOpenHelp}
            >
              <div className="left">
                <svg
                  fill="#ffffff"
                  height="25"
                  width="25"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M403.234,395.844c-13.611-5.956-29.056-12.689-46.626-20.736l-0.794-0.358l-0.623,0.606 c-5.879,5.709-12.39,11.11-19.371,16.06l-1.792,1.263l1.988,0.93c22.067,10.257,41.182,18.662,57.353,25.737 c59.998,26.18,67.576,31.292,67.576,45.559c0,9.796-9.66,21.641-21.641,21.641H72.687c-11.981,0-21.641-11.844-21.641-21.641 c0-14.268,7.586-19.379,67.576-45.559c16.171-7.074,35.294-15.479,57.353-25.737l1.988-0.93l-1.792-1.263 c-6.972-4.949-13.491-10.359-19.371-16.06l-0.623-0.606l-0.794,0.358c-17.579,8.038-33.016,14.78-46.626,20.736 C48.239,422.263,25.6,432.154,25.6,464.913C25.6,489.557,48.043,512,72.687,512h366.626c24.644,0,47.087-22.443,47.087-47.087 C486.4,432.154,463.761,422.263,403.234,395.844z" />
                  <path d="M435.2,153.6h-25.6C409.6,68.77,340.83,0,256,0S102.4,68.77,102.4,153.6H76.8c-14.14,0-25.6,11.46-25.6,25.6V256 c0,14.14,11.46,25.6,25.6,25.6h25.6c7.56,0,14.174-3.422,18.867-8.627c0.777,1.101,1.468,2.219,2.389,3.285 C141.38,346.411,193.997,397.432,256,397.432c63.505,0,117.052-53.572,133.461-126.353c4.668,6.229,11.759,10.522,20.139,10.522 h25.6c14.14,0,25.6-11.46,25.6-25.6v-76.8C460.8,165.06,449.34,153.6,435.2,153.6z M102.4,256H76.8v-76.8h25.6V256z M256,371.985 c-41.412,0-77.611-29.21-97.374-72.559C188.962,312.627,228.727,320,256,320c7.074,0,12.8-5.726,12.8-12.8s-5.726-12.8-12.8-12.8 c-45.005,0-92.996-17.988-109.107-30.822c-2.654-12.527-4.19-25.651-4.19-39.262c0-81.425,50.833-147.669,113.297-147.669 s113.297,66.244,113.297,147.669S318.464,371.985,256,371.985z M383.693,156.655C362.53,94.729,313.267,51.2,256,51.2 c-57.267,0-106.53,43.529-127.693,105.455c-0.026-1.041-0.307-2.014-0.307-3.055c0-70.579,57.421-128,128-128s128,57.421,128,128 C384,154.641,383.718,155.614,383.693,156.655z M435.2,256h-25.6v-76.8h25.6V256z" />
                </svg>
                <div className="item-texts">
                  <div className="item-title">Help &amp; Support</div>
                  <div className="item-sub">
                    Get support or send feedback
                  </div>
                </div>
              </div>
              <div className="right">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {/* Security — shield with keyhole */}
            <button
              type="button"
              className="settings-item"
              onClick={onOpenSecurity}
            >
              <div className="left">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.91 11.12C20.91 16.01 17.36 20.59 12.51 21.93C12.18 22.02 11.82 22.02 11.49 21.93C6.63996 20.59 3.08997 16.01 3.08997 11.12V6.72997C3.08997 5.90997 3.70998 4.97998 4.47998 4.66998L10.05 2.39001C11.3 1.88001 12.71 1.88001 13.96 2.39001L19.53 4.66998C20.29 4.97998 20.92 5.90997 20.92 6.72997L20.91 11.12Z"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 12.5C13.1046 12.5 14 11.6046 14 10.5C14 9.39543 13.1046 8.5 12 8.5C10.8954 8.5 10 9.39543 10 10.5C10 11.6046 10.8954 12.5 12 12.5Z"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 12.5V15.5"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="item-texts">
                  <div className="item-title">Security</div>
                  <div className="item-sub">
                    Manage PIN, password &amp; sessions
                  </div>
                </div>
              </div>
              <div className="right">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {/* Referrals — megaphone */}
            <button
              type="button"
              className="settings-item"
              onClick={onOpenReferrals}
            >
              <div className="left">
                <svg
                  fill="#ffffff"
                  width="25"
                  height="25"
                  viewBox="0 0 1920 1920"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1587.162 31.278c11.52-23.491 37.27-35.689 63.473-29.816 25.525 6.099 43.483 28.8 43.483 55.002V570.46C1822.87 596.662 1920 710.733 1920 847.053c0 136.32-97.13 250.503-225.882 276.705v513.883c0 26.202-17.958 49.016-43.483 55.002a57.279 57.279 0 0 1-12.988 1.468c-21.12 0-40.772-11.745-50.485-31.171C1379.238 1247.203 964.18 1242.347 960 1242.347H564.706v564.706h87.755c-11.859-90.127-17.506-247.003 63.473-350.683 52.405-67.087 129.657-101.082 229.948-101.082v112.941c-64.49 0-110.57 18.861-140.837 57.487-68.781 87.868-45.064 263.83-30.269 324.254 4.18 16.828.34 34.673-10.277 48.34-10.73 13.665-27.219 21.684-44.499 21.684H508.235c-31.171 0-56.47-25.186-56.47-56.47v-621.177h-56.47c-155.747 0-282.354-126.607-282.354-282.353v-56.47h-56.47C25.299 903.523 0 878.336 0 847.052c0-31.172 25.299-56.471 56.47-56.471h56.471v-56.47c0-155.634 126.607-282.354 282.353-282.354h564.593c16.941-.112 420.48-7.002 627.275-420.48Zm-5.986 218.429c-194.71 242.371-452.216 298.164-564.705 311.04v572.724c112.489 12.876 369.995 68.556 564.705 311.04ZM903.53 564.7H395.294c-93.402 0-169.412 76.01-169.412 169.411v225.883c0 93.402 76.01 169.412 169.412 169.412H903.53V564.7Zm790.589 123.444v317.93c65.618-23.379 112.94-85.497 112.94-159.021 0-73.525-47.322-135.53-112.94-158.909Z"
                    fillRule="evenodd"
                  />
                </svg>
                <div className="item-texts">
                  <div className="item-title">Referrals</div>
                  <div className="item-sub">Invite friends and earn</div>
                </div>
              </div>
              <div className="right">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {/* Logout — power button */}
            <button
              type="button"
              className="settings-item logout-item"
              onClick={onLogout}
            >
              <div className="left">
                <svg
                  className="logout-icon"
                  width="35"
                  height="35"
                  viewBox="0 -0.5 25 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.75 9.874C11.75 10.2882 12.0858 10.624 12.5 10.624C12.9142 10.624 13.25 10.2882 13.25 9.874H11.75ZM13.25 4C13.25 3.58579 12.9142 3.25 12.5 3.25C12.0858 3.25 11.75 3.58579 11.75 4H13.25ZM9.81082 6.66156C10.1878 6.48991 10.3542 6.04515 10.1826 5.66818C10.0109 5.29121 9.56615 5.12478 9.18918 5.29644L9.81082 6.66156ZM5.5 12.16L4.7499 12.1561L4.75005 12.1687L5.5 12.16ZM12.5 19L12.5086 18.25C12.5029 18.25 12.4971 18.25 12.4914 18.25L12.5 19ZM19.5 12.16L20.2501 12.1687L20.25 12.1561L19.5 12.16ZM15.8108 5.29644C15.4338 5.12478 14.9891 5.29121 14.8174 5.66818C14.6458 6.04515 14.8122 6.48991 15.1892 6.66156L15.8108 5.29644ZM13.25 9.874V4H11.75V9.874H13.25ZM9.18918 5.29644C6.49843 6.52171 4.7655 9.19951 4.75001 12.1561L6.24999 12.1639C6.26242 9.79237 7.65246 7.6444 9.81082 6.66156L9.18918 5.29644ZM4.75005 12.1687C4.79935 16.4046 8.27278 19.7986 12.5086 19.75L12.4914 18.25C9.08384 18.2892 6.28961 15.5588 6.24995 12.1513L4.75005 12.1687ZM12.4914 19.75C16.7272 19.7986 20.2007 16.4046 20.2499 12.1687L18.7501 12.1513C18.7104 15.5588 15.9162 18.2892 12.5086 18.25L12.4914 19.75ZM20.25 12.1561C20.2345 9.19951 18.5016 6.52171 15.8108 5.29644L15.1892 6.66156C17.3475 7.6444 18.7376 9.79237 18.75 12.1639L20.25 12.1561Z"
                    fill="#ffffff"
                  />
                </svg>
                <div className="item-texts">
                  <div className="item-title">Logout</div>
                  <div className="item-sub">Sign out of this device</div>
                </div>
              </div>
              <div className="right">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          </div>

          <div style={{ height: 10 }} />
        </div>
      </div>
    </div>,
    document.body
  )
}