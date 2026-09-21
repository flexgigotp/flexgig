import { useNavigate } from 'react-router-dom'
import SetupPinModal from '@/components/pin/SetupPinModal'
import { useSession } from '@/hooks'
import { toast } from '@/stores/toastStore'

export default function PinSetupPage() {
  const navigate = useNavigate()
  const { refetch } = useSession()

  return (
    <SetupPinModal
      onClose={() => navigate(-1)}
      onSuccess={async () => {
        toast.success('PIN created successfully')
        await refetch()
        navigate('/dashboard', { replace: true })
      }}
    />
  )
}