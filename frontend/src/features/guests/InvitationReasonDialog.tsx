import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../../api/client'
import type { Guest, IssuedInvitation } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { Modal } from '../../components/Modal'

export function InvitationReasonDialog({
  guest,
  action,
  onClose,
  onIssued,
}: {
  guest: Guest
  action: 'reissue' | 'revoke'
  onClose: () => void
  onIssued: (issued: IssuedInvitation) => void
}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: async (): Promise<IssuedInvitation | null> => {
      if (!token) throw new ApiError('Your session expired. Please sign in again.', 401)
      if (action === 'reissue') {
        return api.reissueInvitation(token, guest.id, reason)
      }
      await api.revokeInvitation(token, guest.id, reason)
      return null
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['statistics'] })
      if (result) onIssued(result)
      else onClose()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  const isReissue = action === 'reissue'
  return (
    <Modal title={isReissue ? 'Replace invitation' : 'Revoke invitation'} description={isReissue ? `The current QR for ${guest.fullName} will stop working.` : `The invitation for ${guest.fullName} will no longer be valid.`} onClose={onClose}>
      <form className="form-stack modal-form" onSubmit={submit}>
        <label className="field-label">Reason
          <input required minLength={3} maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={isReissue ? 'e.g. Lost printed invitation' : 'e.g. Invitation cancelled'} />
        </label>
        {mutation.error ? <div className="alert alert-error" role="alert">{mutation.error instanceof ApiError ? mutation.error.message : 'The invitation action failed.'}</div> : null}
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className={`button ${isReissue ? 'button-primary' : 'button-danger'}`} type="submit" disabled={reason.trim().length < 3 || mutation.isPending}>{mutation.isPending ? 'Working…' : isReissue ? 'Replace QR' : 'Revoke invitation'}</button>
        </div>
      </form>
    </Modal>
  )
}
