import { Download, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError, api, saveBlob } from '../../api/client'
import type { IssuedInvitation } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { Modal } from '../../components/Modal'

export function QrPreviewDialog({
  issued,
  onClose,
}: {
  issued: IssuedInvitation
  onClose: () => void
}) {
  const { token } = useAuth()
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadingCard, setDownloadingCard] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    let objectUrl = ''
    api.downloadQr(token, issued.invitation.id).then(({ blob }) => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setPreviewUrl(objectUrl)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof ApiError ? cause.message : 'Could not load QR image.')
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [issued.invitation.id, token])

  async function download() {
    if (!token) return
    setDownloading(true)
    setError('')
    try {
      const { blob, fileName } = await api.downloadQr(token, issued.invitation.id)
      saveBlob(blob, fileName)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not download QR image.')
    } finally {
      setDownloading(false)
    }
  }

  async function downloadCard() {
    if (!token) return
    setDownloadingCard(true)
    setError('')
    try {
      const { blob, fileName } = await api.downloadCard(token, issued.invitation.id)
      saveBlob(blob, fileName)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not download invitation card.')
    } finally {
      setDownloadingCard(false)
    }
  }

  return (
    <Modal title="Invitation ready" description={`A QR invitation has been created for ${issued.guest.fullName}.`} onClose={onClose}>
      <div className="qr-result">
        <div className="qr-artwork">{previewUrl ? <img src={previewUrl} alt={`QR invitation for ${issued.guest.fullName}`} /> : error ? <QrCode size={48} /> : <span className="spinner" />}</div>
        <strong className="qr-file-name">{issued.invitation.qrFileName}</strong>
        <p>Download or print this image. The QR contains a private invitation token—not the guest's name or phone number.</p>
        {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Close</button>
          <button className="button button-secondary" type="button" onClick={downloadCard} disabled={downloadingCard}><Download size={16} />{downloadingCard ? 'Preparing…' : 'Download card'}</button>
          <button className="button button-primary" type="button" onClick={download} disabled={downloading}><Download size={16} />{downloading ? 'Preparing…' : 'Download QR'}</button>
        </div>
      </div>
    </Modal>
  )
}
