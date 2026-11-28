import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../../api/client'
import type { Guest, IssuedInvitation } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { Modal } from '../../components/Modal'

export function GuestFormDialog({
  guest,
  onClose,
  onIssued,
}: {
  guest?: Guest
  onClose: () => void
  onIssued: (issued: IssuedInvitation) => void
}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState(guest?.fullName ?? '')
  const [phoneNumber, setPhoneNumber] = useState(guest?.phoneNumber ?? '')

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new ApiError('Your session expired. Please sign in again.', 401)
      if (guest) {
        await api.updateGuest(token, guest.id, { fullName, phoneNumber })
        return null
      }
      return api.registerGuest(token, { fullName, phoneNumber })
    },
    onSuccess: async (issued) => {
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['statistics'] })
      if (issued) onIssued(issued)
      else onClose()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal title={guest ? 'Edit guest details' : 'Register a guest'} description={guest ? 'Update their contact information.' : 'An individual invitation and QR code will be created.'} onClose={onClose}>
      <form className="form-stack modal-form" onSubmit={submit}>
        <label className="field-label">Guest full name
          <input required minLength={2} maxLength={160} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Ahmed Mohamed" />
        </label>
        <label className="field-label">Phone number
          <input required minLength={9} maxLength={32} type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="e.g. 0712 345 678" />
          <small className="field-help">Tanzanian mobile numbers are saved in +255 format.</small>
        </label>
        {mutation.error ? <div className="alert alert-error" role="alert">{mutation.error instanceof ApiError ? mutation.error.message : 'Could not save this guest.'}</div> : null}
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : guest ? 'Save changes' : 'Create guest & QR'}</button>
        </div>
      </form>
    </Modal>
  )
}
