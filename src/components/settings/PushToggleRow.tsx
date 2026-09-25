import { useEffect } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import {
  usePushStore,
  refreshPush,
  enablePush,
  disablePush,
} from '@/hooks/usePush'
import { toast } from '@/stores/toastStore'

/** Same markup/classes as the "Show wallet balance" row in SecuritySheet. */
export default function PushToggleRow() {
  const { isIOS, isInstalled } = useInstallPrompt()
  const { ready, available, permission, enabled, subscribed, busy } = usePushStore()

  useEffect(() => {
    void refreshPush()
  }, [])

  const on = enabled && subscribed && permission === 'granted'
  const unsupported = permission === 'unsupported'
  const blocked = permission === 'denied'

  let desc = 'Alerts for wallet credits and announcements'
  if (!ready) desc = 'Checking device…'
  else if (unsupported) {
    desc = isIOS && !isInstalled ? 'Add FlexGig to your Home Screen first' : 'Not supported on this device'
  } else if (!available) desc = 'Not available right now'
  else if (blocked) desc = 'Blocked in your browser settings'

  const disabled = !ready || unsupported || !available || blocked || busy

  const onToggle = async () => {
    if (disabled) return

    if (on) {
      try {
        await disablePush()
        toast.success('Notifications turned off')
      } catch {
        toast.error('Could not turn off notifications')
      }
      return
    }

    const result = await enablePush()
    if (result === 'ok') toast.success('Notifications turned on')
    else if (result === 'denied') toast.info('Notifications are blocked in your browser settings')
    else if (result === 'error') toast.error('Could not turn on notifications')
  }

  return (
    <div className="setting-row" role="listitem">
      <div className="setting-left">
        <div className="setting-title">Push notifications</div>
        <div className="setting-desc">{desc}</div>
      </div>
      <div className="setting-right">
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={on}
          aria-label="Toggle push notifications"
          onClick={onToggle}
          disabled={disabled}
        >
          <span className="knob" />
        </button>
      </div>
    </div>
  )
}