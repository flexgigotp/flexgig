import { useNavigate } from 'react-router-dom'
import ChangePinModal from '@/components/pin/ChangePinModal'
import { useSession } from '@/hooks'
import { toast } from '@/stores/toastStore'

export default function PinChangePage() {
  const navigate = useNavigate()
  const { refetch } = useSession()

  return (
    <ChangePinModal
      onClose={() => navigate(-1)}
      onSuccess={async () => {
        toast.success('PIN updated successfully')
        await refetch()
        navigate('/dashboard', { replace: true })
      }}
    />
  )
}