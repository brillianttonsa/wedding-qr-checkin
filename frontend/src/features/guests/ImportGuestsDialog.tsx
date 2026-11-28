import { FileSpreadsheet, Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../../api/client'
import type { ImportResult } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { Modal } from '../../components/Modal'

export function ImportGuestsDialog({ onClose }: { onClose: () => void }) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const mutation = useMutation({
    mutationFn: () => {
      if (!token) throw new ApiError('Your session expired. Please sign in again.', 401)
      if (!file) throw new ApiError('Choose a CSV or XLSX file first.', 400)
      return api.importGuests(token, file)
    },
    onSuccess: async (data) => {
      setResult(data)
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['statistics'] })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal title={result ? 'Import summary' : 'Import guest list'} description={result ? 'Review the rows that were imported.' : 'Upload a CSV or Excel file with full_name and phone_number columns.'} onClose={onClose} wide>
      {result ? (
        <div className="modal-form">
          <div className="import-summary">
            <div><strong>{result.successful.length}</strong><span>guests registered</span></div>
            <div><strong>{result.failed.length}</strong><span>rows need attention</span></div>
          </div>
          {result.failed.length ? <div className="import-errors">
            <strong>Rows not imported</strong>
            <ul>{result.failed.map((item) => <li key={`${item.row}-${item.error}`}><b>Row {item.row}</b> {item.error}</li>)}</ul>
          </div> : <div className="alert alert-success">All rows were imported successfully.</div>}
          <div className="modal-actions"><button className="button button-primary" type="button" onClick={onClose}>Done</button></div>
        </div>
      ) : (
        <form className="form-stack modal-form" onSubmit={submit}>
          <label className="upload-zone">
            <span className="upload-icon"><FileSpreadsheet size={22} /></span>
            <strong>{file?.name ?? 'Choose a guest list'}</strong>
            <span>CSV or XLSX · maximum 2 MB · up to 1,000 rows</span>
            <input type="file" accept=".csv,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="import-template"><b>Expected columns</b><code>full_name, phone_number</code><span>Example: Ahmed Mohamed, 0712345678</span></div>
          {mutation.error ? <div className="alert alert-error" role="alert">{mutation.error instanceof ApiError ? mutation.error.message : 'The guest list could not be imported.'}</div> : null}
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={!file || mutation.isPending}><Upload size={16} />{mutation.isPending ? 'Importing…' : 'Import guests'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
