import { CalendarDays, LayoutDashboard, LogOut, ScanLine, ShieldCheck } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function AppShell() {
  const { user, signOut } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand-lockup" to={isAdmin ? '/admin' : '/scanner'}>
          <span className="brand-mark"><CalendarDays size={21} /></span>
          <span><strong>Gather</strong><small>WEDDING CHECK-IN</small></span>
        </NavLink>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {isAdmin ? (
            <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/admin">
              <LayoutDashboard size={18} /> Guest overview
            </NavLink>
          ) : null}
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/scanner">
            <ScanLine size={18} /> Check-in scanner
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />
        <div className="secure-note"><ShieldCheck size={17} /><span>Private event workspace</span></div>
        <div className="profile-card">
          <div className="avatar">{user?.username.slice(0, 1).toUpperCase()}</div>
          <div className="profile-copy"><strong>{user?.username}</strong><span>{isAdmin ? 'Administrator' : 'Security guard'}</span></div>
          <button className="icon-button logout-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="main-panel">
        <header className="mobile-header">
          <NavLink className="brand-lockup" to={isAdmin ? '/admin' : '/scanner'}>
            <span className="brand-mark"><CalendarDays size={20} /></span>
            <span><strong>Gather</strong><small>WEDDING CHECK-IN</small></span>
          </NavLink>
          <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>
        </header>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {isAdmin ? <NavLink to="/admin" aria-label="Guest overview"><LayoutDashboard size={19} /><span>Guests</span></NavLink> : null}
          <NavLink to="/scanner" aria-label="Check-in scanner"><ScanLine size={19} /><span>Scanner</span></NavLink>
        </nav>
        <Outlet />
      </main>
    </div>
  )
}
