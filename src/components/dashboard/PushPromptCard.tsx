import { useEffect, useState } from 'react'
import { useSession } from '@/hooks'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { usePushStore, refreshPush, enablePush } from '@/hooks/usePush'
import { toast } from '@/stores/toastStore'

const DISMISS_KEY = 'flexgig-push-prompt-dismissed'
const DISMISS_DAYS = 7

function recentlyDismissed(): boolean {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return t > 0 && Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

const btn: React.CSSProperties = {
  border: 'none',
  borderRadius: 20,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

export default function PushPromptCard() {
  const { user } = useSession()
  const uid = user?.uid
  const { isIOS, isInstalled } = useInstallPrompt()
  const { ready, available, permission, enabled, busy } = usePushStore()
  const [dismissed, setDismissed] = useState(recentlyDismissed)

  // Silent resync for users who already granted permission. Never prompts.
  useEffect(() => {
    if (uid) void refreshPush()
  }, [uid])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  const onEnable = async () => {
    const result = await enablePush()
    if (result === 'ok') {
      toast.success('Notifications turned on')
    } else if (result === 'denied') {
      toast.info('Notifications are blocked. You can allow them in your browser settings.')
      dismiss()
    } else if (result === 'error') {
      toast.error('Could not turn on notifications. Please try again.')
    }
  }

  if (!ready || dismissed) return null

  // iPhones only allow push once the app is added to the Home Screen
  const needsInstall = permission === 'unsupported' && isIOS && !isInstalled
  const canAsk = available && enabled && permission === 'default'
  if (!needsInstall && !canAsk) return null

  return (
    <div
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: '#fff',
      }}
    >
      <div style={{ fontSize: 24 }} aria-hidden>
        🔔
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {needsInstall ? 'Get instant alerts' : 'Turn on notifications'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          {needsInstall
            ? 'Add FlexGig to your Home Screen to get wallet and announcement alerts.'
            : 'Know the moment your wallet is credited, plus important announcements.'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {canAsk && (
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            style={{ ...btn, background: '#00bfa5', color: '#fff', opacity: busy ? 0.6 : 1 }}
          >
            Turn on
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          style={{ ...btn, background: 'transparent', color: 'rgba(255,255,255,0.6)', padding: '4px 8px' }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}