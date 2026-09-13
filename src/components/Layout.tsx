import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-white text-center py-4">
        <p>&copy; 2026 FlexGig. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Layout
