import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks'
import Loader from '@/components/Loader'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, hasFetched } = useSession()
  const location = useLocation()

  // Show loading screen until the first session fetch resolves.
  // Prevents redirecting an actually-logged-in user during cold load.
    if (!hasFetched || isLoading) {
    return <Loader />
  }

  if (!user) {
    // Not authenticated → kick to home, remember where they wanted to go
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}