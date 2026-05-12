import { Navigate } from 'react-router-dom'

export default function AuthGuard({ children, requiredRole }) {
  const token = localStorage.getItem('token')
  const userRaw = localStorage.getItem('user')

  if (!token || !userRaw) {
    return <Navigate to="/" replace />
  }

  try {
    const user = JSON.parse(userRaw)
    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/" replace />
    }
  } catch {
    return <Navigate to="/" replace />
  }

  return children
}
