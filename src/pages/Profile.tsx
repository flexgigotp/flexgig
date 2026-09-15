import { useAuth } from '@/hooks'
import { formatDate } from '@/utils/formatters'

function Profile() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <p className="text-gray-600 text-sm">Full Name</p>
            <p className="text-lg font-semibold">{user.fullName}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Email</p>
            <p className="text-lg font-semibold">{user.email}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Verification Status</p>
            <p className="text-lg font-semibold">
              {user.verified ? (
                <span className="text-green-600">✓ Verified</span>
              ) : (
                <span className="text-yellow-600">Pending Verification</span>
              )}
            </p>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Account Created</p>
            <p className="text-lg font-semibold">{formatDate(user.createdAt)}</p>
          </div>

          <div className="pt-4">
            <button className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
