// src/lib/webauthnHelpers.ts

/**
 * Decode a base64url string to a Uint8Array explicitly backed by an
 * ArrayBuffer. The explicit <ArrayBuffer> generic is required for TS 5.7+
 * because the WebAuthn APIs want BufferSource, not Uint8Array<ArrayBufferLike>.
 */
export function base64UrlToUint8(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob(b64 + pad)
  // Allocate the backing ArrayBuffer explicitly so TS knows the type
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Encode a buffer to base64url (no padding). */
export function uint8ToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decode a UUID string to a 16-byte Uint8Array (used for user.id fallback). */
export function uuidToUint8(uuid: string): Uint8Array<ArrayBuffer> {
  const clean = uuid.replace(/-/g, '')
  if (clean.length !== 32) throw new Error('Invalid UUID')
  const buffer = new ArrayBuffer(16)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < 16; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return out
}

/**
 * Best-effort coerce any value the server sent (string, array, buffer,
 * numeric-object from a bad JSON serialization) into a Uint8Array.
 */
export function coerceToUint8(
  value: unknown
): Uint8Array<ArrayBuffer> | null {
  if (value == null) return null

  if (value instanceof Uint8Array) {
    // Copy into a fresh ArrayBuffer to normalize the generic
    const buffer = new ArrayBuffer(value.length)
    const out = new Uint8Array(buffer)
    out.set(value)
    return out
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView
    const buffer = new ArrayBuffer(view.byteLength)
    const out = new Uint8Array(buffer)
    out.set(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    )
    return out
  }

  if (typeof value === 'string') {
    try {
      return base64UrlToUint8(value)
    } catch {
      return null
    }
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>

    if (Array.isArray(obj.data)) {
      const arr = obj.data as number[]
      const buffer = new ArrayBuffer(arr.length)
      const out = new Uint8Array(buffer)
      for (let i = 0; i < arr.length; i++) out[i] = arr[i] & 0xff
      return out
    }

    const numericKeys = Object.keys(obj)
      .filter((k) => /^\d+$/.test(k))
      .map(Number)

    if (numericKeys.length) {
      const max = Math.max(...numericKeys)
      const buffer = new ArrayBuffer(max + 1)
      const out = new Uint8Array(buffer)
      for (const k of numericKeys) {
        out[k] = ((obj[String(k)] as number) | 0) & 0xff
      }
      return out
    }
  }

  return null
}