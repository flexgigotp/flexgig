import { useNavigate } from 'react-router-dom'
import FullScreenModal from '@/components/modals/FullScreenModal'

export default function ProfileUpdatePage() {
  const navigate = useNavigate()

  return (
    <FullScreenModal title="Update Profile" onClose={() => navigate(-1)}>
      <div
        style={{
          color: '#999',
          textAlign: 'center',
          padding: 40,
          fontSize: 15,
        }}
      >
        Profile update — coming in Phase 6
      </div>
    </FullScreenModal>
  )
}