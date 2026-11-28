import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, CalendarDays, Check, Clock3, Plus, Search, ShieldAlert, Upload } from 'lucide-react'
import { api, ApiError, saveBlob } from '../api/client'
import type { Guest, IssuedInvitation } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { GuestFormDialog } from '../features/guests/GuestFormDialog'
import { GuestTable, type GuestAction } from '../features/guests/GuestTable'
import { ImportGuestsDialog } from '../features/guests/ImportGuestsDialog'
import { InvitationReasonDialog } from '../features/guests/InvitationReasonDialog'
import { QrPreviewDialog } from '../features/guests/QrPreviewDialog'

const filters = [
  { value: 'all', label: 'All guests' },
  { value: 'not-checked-in', label: 'Not arrived' },
  { value: 'checked-in', label: 'Admitted' },
  { value: 'revoked', label: 'Revoked' },
]

export function AdminPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [dialog, setDialog] = useState<'register' | 'import' | null>(null)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [reasonAction, setReasonAction] = useState<{ guest: Guest; action: 'reissue' | 'revoke' } | null>(null)
  const [qrIssued, setQrIssued] = useState<IssuedInvitation | null>(null)
  const [error, setError] = useState('')

  const guestsQuery = useQuery({
    queryKey: ['guests', search, filter],
    queryFn: ({ signal }) => api.guests(token!, { search, status: filter }, signal),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  })
  const statsQuery = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api.statistics(token!),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  })
  const pageError = guestsQuery.error ?? statsQuery.error

  const downloadAll = useMutation({
    mutationFn: async () => {
      if (!token) throw new ApiError('Your session expired. Please sign in again.', 401)
      return api.downloadAllQr(token)
    },
    onSuccess: (blob) => saveBlob(blob, 'wedding-qr-codes.zip'),
  })

  async function onGuestAction(action: GuestAction) {
    setError('')
    try {
      if (!token) throw new ApiError('Your session expired. Please sign in again.', 401)
      switch (action.type) {
        case 'edit':
          setEditingGuest(action.guest)
          break
        case 'download': {
          if (!action.guest.invitationId) return
          const { blob, fileName } = await api.downloadQr(token, action.guest.invitationId)
          saveBlob(blob, fileName)
          break
        }
        case 'issue': {
          const issued = await api.issueInvitation(token, action.guest.id)
          await queryClient.invalidateQueries({ queryKey: ['guests'] })
          await queryClient.invalidateQueries({ queryKey: ['statistics'] })
          setQrIssued(issued)
          break
        }
        case 'reissue':
        case 'revoke':
          setReasonAction({ guest: action.guest, action: action.type })
          break
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not complete the guest action.')
    }
  }

  const stats = statsQuery.data
  return (
    <div className="page-content">
      <PageHeader
        eyebrow="ADMINISTRATION · 19 DECEMBER 2026"
        title="Guest overview"
        description="A clear view of your guests, invitations, and arrivals."
        actions={<>
          <button className="button button-secondary" type="button" onClick={() => setDialog('import')}><Upload size={16} /> Import list</button>
          <button className="button button-primary" type="button" onClick={() => setDialog('register')}><Plus size={17} /> Register guest</button>
        </>}
      />

      <section className="stat-grid" aria-label="Attendance statistics">
        <StatCard label="Registered guests" value={stats?.totalGuests} icon={<CalendarDays size={18} />} tone="lavender" />
        <StatCard label="Admitted" value={stats?.admitted} icon={<Check size={18} />} tone="green" />
        <StatCard label="Not arrived" value={stats?.notAdmitted} icon={<Clock3 size={18} />} tone="sand" />
        <StatCard label="Revoked invites" value={stats?.revoked} icon={<ShieldAlert size={18} />} tone="rose" />
      </section>

      <section className="guest-panel">
        <div className="panel-heading">
          <div><h2>Guest list</h2><p>Search your list and manage each invitation.</p></div>
          <button className="button button-secondary button-small" type="button" onClick={() => downloadAll.mutate()} disabled={downloadAll.isPending}>
            <ArrowDownToLine size={16} />{downloadAll.isPending ? 'Preparing ZIP…' : 'Download all QR'}
          </button>
        </div>
        <div className="guest-toolbar">
          <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or phone" aria-label="Search guests by name or phone" /></label>
          <div className="filter-tabs" role="group" aria-label="Filter guests">
            {filters.map((item) => <button key={item.value} type="button" className={filter === item.value ? 'filter-tab selected' : 'filter-tab'} onClick={() => setFilter(item.value)}>{item.label}</button>)}
          </div>
        </div>
        {error || downloadAll.error ? <div className="alert alert-error page-alert" role="alert">{error || (downloadAll.error instanceof ApiError ? downloadAll.error.message : 'Could not download QR archive.')}</div> : null}
        {pageError ? <div className="alert alert-error page-alert" role="alert">{pageError instanceof ApiError ? pageError.message : 'Could not load the event data.'}</div> : null}
        <GuestTable guests={guestsQuery.data ?? []} loading={guestsQuery.isLoading} onAction={onGuestAction} />
        <div className="table-footer"><span>Showing {guestsQuery.data?.length ?? 0} guests</span><span className="live-indicator"><i /> Live updates every 15 seconds</span></div>
      </section>

      <footer className="page-footer"><span>Gather · Wedding guest admission</span><span>19 December 2026</span></footer>

      {dialog === 'register' ? <GuestFormDialog onClose={() => setDialog(null)} onIssued={(issued) => { setDialog(null); setQrIssued(issued) }} /> : null}
      {dialog === 'import' ? <ImportGuestsDialog onClose={() => setDialog(null)} /> : null}
      {editingGuest ? <GuestFormDialog guest={editingGuest} onClose={() => setEditingGuest(null)} onIssued={setQrIssued} /> : null}
      {reasonAction ? <InvitationReasonDialog guest={reasonAction.guest} action={reasonAction.action} onClose={() => setReasonAction(null)} onIssued={(issued) => { setReasonAction(null); setQrIssued(issued) }} /> : null}
      {qrIssued ? <QrPreviewDialog issued={qrIssued} onClose={() => setQrIssued(null)} /> : null}
    </div>
  )
}

function StatCard({ label, value, icon, tone }: { label: string; value?: number; icon: ReactNode; tone: string }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><span className="stat-label">{label}</span><strong>{value === undefined ? '—' : value.toLocaleString()}</strong></div><span className="stat-spark" aria-hidden="true">✳</span></article>
}
