import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-2xl text-gray-600 mb-8">Page Not Found</p>
      <p className="text-gray-500 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="bg-primary text-white px-6 py-3 rounded hover:bg-blue-600 inline-block"
      >
        Go Back Home
      </Link>
    </div>
  )
}

export default NotFound
