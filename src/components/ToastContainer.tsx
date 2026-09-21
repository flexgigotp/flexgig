import { useToastStore } from '@/stores/toastStore'

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fg-toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`fg-toast fg-toast-${t.type}`}
          role="status"
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}