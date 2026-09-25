import { useNavigate, useSearchParams } from 'react-router-dom'
import ChangePinModal from '@/components/pin/ChangePinModal'
import ResetPinSheet from '@/components/pin/ResetPinSheet'
import SetupPinModal from '@/components/pin/SetupPinModal'
import { useSession } from '@/hooks'
import { toast } from '@/stores/toastStore'

type Flow = 'otp' | 'setup' | null

export default function PinChangePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refetch } = useSession()

  const flow = (searchParams.get('flow') as Flow) || null

  const handleFinalSuccess = async (msg: string) => {
    toast.success(msg)
    await refetch()
    navigate('/dashboard', { replace: true })
  }

  const startForgotPin = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('flow', 'otp')
    navigate(url.pathname + url.search)
  }

  const handleOtpVerified = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('flow', 'setup')
    navigate(url.pathname + url.search, { replace: true })
  }

  const cancelOtp = () => {
    // Pop back to /pin-change
    navigate(-1)
  }

  const cancelSetup = () => {
    // Post-OTP: old PIN is still valid, but returning to "enter current PIN"
    // is unfair since the user proved identity via email. Exit to dashboard.
    void handleFinalSuccess('PIN reset cancelled')
  }

  return (
    <>
      {!flow && (
        <ChangePinModal
          onClose={() => navigate(-1)}
          onSuccess={() => handleFinalSuccess('PIN updated successfully')}
          onForgotPin={startForgotPin}
        />
      )}

      {flow === 'otp' && (
        <ResetPinSheet
          onClose={cancelOtp}
          onVerified={handleOtpVerified}
        />
      )}

      {flow === 'setup' && (
        <SetupPinModal
          onClose={cancelSetup}
          onSuccess={() => handleFinalSuccess('PIN reset successfully')}
        />
      )}
    </>
  )
}