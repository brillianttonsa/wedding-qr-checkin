import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { UserRole } from '../api/types'
import { useAuth } from './useAuth'

export function RouteGuard({ allow }: { allow: UserRole[] }) {
  const { user, token } = useAuth()
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/scanner'} replace />
  }
  return <Outlet />
}
