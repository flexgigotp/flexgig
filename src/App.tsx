import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import Profile from '@/pages/Profile'
import NotFound from '@/pages/NotFound'
import { useAuthStore } from '@/stores/authStore'
import Login from '@/pages/Login'
import PinSetupPage from '@/pages/PinSetupPage'
import PinChangePage from '@/pages/PinChangePage'
import ProfileUpdatePage from '@/pages/ProfileUpdatePage'
import ToastContainer from '@/components/ToastContainer'
import ReauthManager from '@/components/ReauthManager'
import TransferPage from '@/pages/TransferPage'

/**
 * Global listener for auth events dispatched by the axios interceptor.
 * Must live inside BrowserRouter so it can navigate.
 */
function SessionWatcher() {
  const navigate = useNavigate()
  const clear = useAuthStore((s) => s.clear)

  useEffect(() => {
    const handleExpired = () => {
      console.warn('[Session] Refresh failed — logging out')
      clear()
      if (window.location.pathname.startsWith('/dashboard')) {
        navigate('/', { replace: true })
      }
    }

    window.addEventListener('session:expired', handleExpired)
    return () => {
      window.removeEventListener('session:expired', handleExpired)
    }
  }, [navigate, clear])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <SessionWatcher />
      <ReauthManager />
      <ToastContainer />
      <Routes>
        {/* Home — standalone, public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Dashboard — protected, has its own layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Profile — protected, uses shared Layout for now */}
        <Route element={<Layout />}>
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
  path="/pin-setup"
  element={
    <ProtectedRoute>
      <PinSetupPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/pin-change"
  element={
    <ProtectedRoute>
      <PinChangePage />
    </ProtectedRoute>
  }
/>
<Route
  path="/profile-update"
  element={
    <ProtectedRoute>
      <ProfileUpdatePage />
    </ProtectedRoute>
  }
/>
<Route
  path="/transfer"
  element={
    <ProtectedRoute>
      <TransferPage />
    </ProtectedRoute>
  }
/>


        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App