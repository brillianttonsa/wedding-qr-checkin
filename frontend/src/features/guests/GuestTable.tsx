import { Download, Edit3, FileImage, KeyRound, QrCode, RefreshCw, ShieldOff } from 'lucide-react'
import type { Guest } from '../../api/types'
import { StatusPill } from '../../components/StatusPill'

export type GuestAction =
  | { type: 'edit'; guest: Guest }
  | { type: 'download'; guest: Guest }
  | { type: 'download-card'; guest: Guest }
  | { type: 'issue'; guest: Guest }
  | { type: 'reissue'; guest: Guest }
  | { type: 'revoke'; guest: Guest }

export function GuestTable({
  guests,
  loading,
  onAction,
}: {
  guests: Guest[]
  loading: boolean
  onAction: (action: GuestAction) => void
}) {
  if (loading) {
    return <div className="table-state"><span className="spinner" /><span>Loading guest list…</span></div>
  }
  if (!guests.length) {
    return <div className="table-state empty-state"><span className="empty-icon"><QrCode size={22} /></span><strong>No guests match this view</strong><span>Try another search or register a guest to get started.</span></div>
  }

  return (
    <div className="table-scroll">
      <table className="guest-table">
        <thead><tr><th>GUEST</th><th>PHONE</th><th>INVITATION</th><th>ADMISSION</th><th>CHECK-IN TIME</th><th className="actions-heading">ACTIONS</th></tr></thead>
        <tbody>
          {guests.map((guest) => {
            const checkedIn = Boolean(guest.checkedInAt)
            return <tr key={guest.id}>
              <td><div className="guest-name-cell"><span className="guest-avatar">{guest.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><strong>{guest.fullName}</strong></div></td>
              <td className="phone-cell">{guest.phoneNumber}</td>
              <td><StatusPill status={guest.invitationStatus} /></td>
              <td><span className={`admission-state${checkedIn ? ' admitted' : ''}`}><i />{checkedIn ? 'Admitted' : 'Not arrived'}</span></td>
              <td className="time-cell">{guest.checkedInAt ? new Date(guest.checkedInAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
              <td><div className="row-actions">
                {guest.invitationStatus === 'ACTIVE' ? <>
                  <button className="icon-button" title="Download QR PNG" aria-label={`Download QR for ${guest.fullName}`} onClick={() => onAction({ type: 'download', guest })}><Download size={16} /></button>
                  <button className="icon-button" title="Download invitation card" aria-label={`Download invitation card for ${guest.fullName}`} onClick={() => onAction({ type: 'download-card', guest })}><FileImage size={16} /></button>
                </> : !checkedIn ? <button className="icon-button" title="Issue invitation" aria-label={`Issue invitation for ${guest.fullName}`} onClick={() => onAction({ type: 'issue', guest })}><KeyRound size={16} /></button> : null}
                <button className="icon-button" title="Edit guest" aria-label={`Edit ${guest.fullName}`} onClick={() => onAction({ type: 'edit', guest })}><Edit3 size={16} /></button>
                {guest.invitationStatus === 'ACTIVE' && !checkedIn ? <>
                  <button className="icon-button" title="Reissue invitation" aria-label={`Reissue invitation for ${guest.fullName}`} onClick={() => onAction({ type: 'reissue', guest })}><RefreshCw size={16} /></button>
                  <button className="icon-button icon-danger" title="Revoke invitation" aria-label={`Revoke invitation for ${guest.fullName}`} onClick={() => onAction({ type: 'revoke', guest })}><ShieldOff size={16} /></button>
                </> : null}
              </div></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  )
}
