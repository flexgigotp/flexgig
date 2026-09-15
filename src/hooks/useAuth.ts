import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, setUser, setIsLoading, setError } =
    useAuthStore()

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true)
      try {
        const { user } = await authService.getSession()
        if (user) {
          setUser(user)
        }
      } catch (err) {
        setError('Failed to load session')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await authService.login({ email, password })
      if (response.data) {
        setUser(response.data.user)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
      setUser(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return { user, isAuthenticated: !!user, isLoading, error, login, logout }
}
