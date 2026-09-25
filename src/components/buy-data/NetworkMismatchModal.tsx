interface NetworkMismatchModalProps {
  phoneDisplay: string
  providerLabel: string
  onConfirm: () => void
  onRecheck: () => void
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 9999999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const btnBase: React.CSSProperties = {
  flex: 1,
  padding: 14,
  border: 'none',
  borderRadius: 50,
  fontWeight: 600,
  fontSize: 16,
  cursor: 'pointer',
}

export default function NetworkMismatchModal({
  phoneDisplay,
  providerLabel,
  onConfirm,
  onRecheck,
}: NetworkMismatchModalProps) {
  return (
    <div
      style={backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onRecheck()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: '#fff',
          maxWidth: 420,
          width: '90%',
          padding: 24,
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 40 }}>
          📶
        </div>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: '#333',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          Are you sure the phone number <b>{phoneDisplay}</b> you entered is
          from <b>{providerLabel}</b>?
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{ ...btnBase, background: '#00bfa5', color: '#fff' }}
          >
            Yes, go on
          </button>
          <button
            type="button"
            onClick={onRecheck}
            style={{ ...btnBase, background: '#e0e0e0', color: '#333' }}
          >
            Recheck
          </button>
        </div>
      </div>
    </div>
  )
}