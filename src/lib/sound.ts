let audio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!audio) {
    try {
      audio = new Audio('/frontend/sound/paymentReceived.wav')
      audio.volume = 0.65
      audio.preload = 'auto'
    } catch {
      audio = null
    }
  }
  return audio
}

/** Play the payment-received chime. Safe to call from anywhere. */
export function playPaymentSound() {
  const a = getAudio()
  if (!a) return
  try {
    a.currentTime = 0
    void a.play().catch(() => {
      // Autoplay policies will block this if there's been no user interaction
      // yet. That's fine — the toast still shows, audio just stays silent.
    })
  } catch {
    // ignore
  }
}