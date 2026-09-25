import { pushApi } from '@/services/api'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// `ready` never resolves if no worker is registered, so don't wait forever.
function getRegistration(): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error('Service worker not ready')), 8000)
    ),
  ])
}

/** Subscribes this device (reusing an existing subscription) and registers it with the server. */
export async function subscribeThisDevice(publicKey: string) {
  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }
  // Always re-send: the upsert is idempotent and repairs rotated/lost subscriptions.
  await pushApi.subscribe(sub.toJSON())
  return sub
}

/** Removes this device from the server and from the browser. */
export async function unsubscribeThisDevice() {
  const reg = await getRegistration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  try {
    await pushApi.unsubscribe(sub.endpoint)
  } catch {
    /* server row will be pruned on the next failed send */
  }
  await sub.unsubscribe()
}