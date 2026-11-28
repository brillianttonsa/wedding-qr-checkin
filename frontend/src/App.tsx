import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { RouteGuard } from './auth/RouteGuard'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'

const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })),
)
const ScannerPage = lazy(() =>
  import('./pages/ScannerPage').then((module) => ({ default: module.ScannerPage })),
)

function PageLoading() {
  return <div className="route-loading"><span className="spinner" /><span>Opening workspace…</span></div>
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'GUARD' ? '/scanner' : '/admin'} replace />
}

function CheckInRedirect() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  return <Navigate to={token ? `/scanner?token=${encodeURIComponent(token)}` : '/scanner'} replace />
}

function NotFound() {
  return <main className="not-found"><span className="eyebrow">GATHER · EVENT ACCESS</span><h1>Page not found</h1><p>This page isn’t part of the event workspace.</p><a className="button button-primary" href="/">Return to workspace</a></main>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/check-in" element={<CheckInRedirect />} />
      <Route element={<RouteGuard allow={['ADMIN', 'GUARD']} />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/scanner" element={<Suspense fallback={<PageLoading />}><ScannerPage /></Suspense>} />
        </Route>
      </Route>
      <Route element={<RouteGuard allow={['ADMIN']} />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<Suspense fallback={<PageLoading />}><AdminPage /></Suspense>} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
