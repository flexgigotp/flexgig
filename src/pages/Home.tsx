import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks'
import Button from '@/components/Button'

function Home() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to FlexGig
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Cheap Data Plug - Get affordable data and airtime on the go
        </p>

        {user ? (
          <div className="space-y-4">
            <p className="text-lg text-gray-700">
              Welcome back, <strong>{user.fullName}</strong>!
            </p>
            <Link to="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700 mb-6">
              Sign in to start earning and enjoying premium benefits
            </p>
            <Link to="/">
              <Button size="lg">Sign In with Email</Button>
            </Link>
            <p className="text-gray-500">or use Google/WebAuthn to continue</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
