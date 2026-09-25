import { create } from 'zustand'
import { pushApi } from '@/services/api'
import {
  isPushSupported,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from '@/lib/pushClient'

type Permission = NotificationPermission | 'unsupported'

interface PushState {
  ready: boolean // status has been fetched at least once
  available: boolean // server has VAPID keys configured
  permission: Permission // browser permission
  enabled: boolean // account preference (users.push_enabled)
  subscribed: boolean // this device is registered
  busy: boolean
}

export const usePushStore = create<PushState>(() => ({
  ready: false,
  available: false,
  permission: 'unsupported',
  enabled: true,
  subscribed: false,
  busy: false,
}))

const set = usePushStore.setState

/**
 * Call after login / on dashboard mount. If the user has push enabled and the
 * browser permission is already granted, quietly (re)subscribes this device.
 * Never prompts — the permission dialog needs a user tap (see enablePush).
 */
export async function refreshPush() {
  if (!isPushSupported()) {
    set({ ready: true, permission: 'unsupported', subscribed: false })
    return
  }
  try {
    const { enabled, publicKey } = await pushApi.status()
    const permission = Notification.permission
    let subscribed = false
    if (enabled && permission === 'granted' && publicKey) {
      await subscribeThisDevice(publicKey)
      subscribed = true
    }
    set({ ready: true, available: !!publicKey, permission, enabled, subscribed })
  } catch {
    set({ ready: true, permission: Notification.permission })
  }
}

export type EnableResult = 'ok' | 'denied' | 'unsupported' | 'error'

/** Must be called directly from a click/tap handler. */
export async function enablePush(): Promise<EnableResult> {
  if (!isPushSupported()) return 'unsupported'
  set({ busy: true })
  try {
    // requestPermission is the FIRST await so the user gesture is still valid (Safari/iOS).
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()

    if (permission !== 'granted') {
      set({ permission, busy: false })
      return 'denied'
    }

    const { publicKey } = await pushApi.status()
    if (!publicKey) {
      set({ busy: false })
      return 'error'
    }

    await pushApi.setEnabled(true)
    await subscribeThisDevice(publicKey)
    set({ permission: 'granted', enabled: true, subscribed: true, busy: false })
    return 'ok'
  } catch {
    set({ busy: false })
    return 'error'
  }
}

/** Turns push off for the account and removes this device. */
export async function disablePush() {
  set({ busy: true })
  try {
    await pushApi.setEnabled(false)
    await unsubscribeThisDevice()
    set({ enabled: false, subscribed: false, busy: false })
  } catch (err) {
    set({ busy: false })
    throw err
  }
}

/**
 * Call right BEFORE the logout request (needs the session cookie).
 * Removes this device so the next person on a shared phone doesn't receive
 * the previous account's alerts. Keeps the account preference untouched.
 * Never blocks logout for more than 3 seconds.
 */
export async function pushLogoutCleanup() {
  if (!isPushSupported()) return
  try {
    await Promise.race([
      unsubscribeThisDevice(),
      new Promise((resolve) => window.setTimeout(resolve, 3000)),
    ])
  } catch {
    /* ignore */
  }
  set({ subscribed: false, ready: false })
}