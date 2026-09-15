import { Navigate } from 'react-router-dom'
import { useProtectedRoute } from '@/hooks'

interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isProtected, isLoading } = useProtectedRoute()

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isProtected) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
