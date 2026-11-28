import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { AlertCircle, Camera, Check, CheckCircle2, CircleOff, QrCode, RotateCcw, ShieldCheck, UserRoundCheck, Wifi, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import type { ConfirmResult, VerifyResponse } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'

type ScanState = 'idle' | 'verifying' | 'valid' | 'rejected' | 'confirmed' | 'confirm-error' | 'error'

export function ScannerPage() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [qrToken, setQrToken] = useState('')
  const [verification, setVerification] = useState<VerifyResponse | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmResult | null>(null)
  const [manualValue, setManualValue] = useState('')
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const cameraGenerationRef = useRef(0)
  const processingRef = useRef(false)
  const retryKeyRef = useRef<string | null>(null)
  const autoToken = searchParams.get('token') ?? ''
  const autoVerifyRef = useRef('')

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const stopCamera = useCallback(() => {
    cameraGenerationRef.current += 1
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
  }, [])

  const verifyValue = useCallback(async (value: string) => {
    if (processingRef.current) return
    processingRef.current = true
    stopCamera()
    setScanState('verifying')
    setMessage('')
    setVerification(null)
    setConfirmation(null)
    retryKeyRef.current = null

    let extracted = value.trim()
    try {
      const url = new URL(extracted)
      extracted = url.searchParams.get('token') ?? ''
    } catch {
      // Scanners may return the raw opaque token instead of its URL.
    }

    if (!/^[A-Za-z0-9_-]{43}$/.test(extracted)) {
      setScanState('error')
      setMessage('This QR code is not a valid wedding invitation.')
      processingRef.current = false
      return
    }
    if (!token) {
      setScanState('error')
      setMessage('Your session expired. Sign in again to verify this invitation.')
      processingRef.current = false
      return
    }

    setQrToken(extracted)
    try {
      const result = await api.verify(token, extracted)
      setVerification(result)
      setScanState(result.status === 'VALID' ? 'valid' : 'rejected')
    } catch (cause) {
      setScanState('error')
      setMessage(cause instanceof ApiError ? cause.message : 'Could not verify this invitation.')
    } finally {
      processingRef.current = false
    }
  }, [stopCamera, token])

  useEffect(() => {
    if (autoToken && autoVerifyRef.current !== autoToken) {
      autoVerifyRef.current = autoToken
      void verifyValue(autoToken)
    }
  }, [autoToken, verifyValue])

  useEffect(() => () => controlsRef.current?.stop(), [])

  async function startCamera() {
    if (!videoRef.current || !online) return
    setMessage('')
    const generation = ++cameraGenerationRef.current
    setScanning(true)
    try {
      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, cameraControls) => {
          controlsRef.current ??= cameraControls
          if (result && !processingRef.current) void verifyValue(result.getText())
        },
      )
      if (generation !== cameraGenerationRef.current) {
        controls.stop()
        return
      }
      controlsRef.current = controls
    } catch {
      if (generation !== cameraGenerationRef.current) return
      setScanState('error')
      setMessage('Camera access was unavailable. Check your browser permission and try again, or enter the QR link below.')
      setScanning(false)
    }
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void verifyValue(manualValue)
  }

  async function confirmAdmission() {
    if (!token || !qrToken || !online || processingRef.current) return
    processingRef.current = true
    setScanState('verifying')
    setMessage('')
    retryKeyRef.current ??= crypto.randomUUID()
    try {
      const result = await api.confirm(token, qrToken, retryKeyRef.current)
      setConfirmation(result)
      if (result.status === 'CONFIRMED') {
        setScanState('confirmed')
        retryKeyRef.current = null
      } else {
        setVerification(result)
        setScanState('rejected')
      }
    } catch (cause) {
      setScanState('confirm-error')
      setMessage(cause instanceof ApiError ? cause.message : 'Could not confirm admission. Retry while online.')
    } finally {
      processingRef.current = false
    }
  }

  function resetScan() {
    processingRef.current = false
    retryKeyRef.current = null
    setScanState('idle')
    setQrToken('')
    setVerification(null)
    setConfirmation(null)
    setMessage('')
    setManualValue('')
    if (autoToken) window.history.replaceState({}, '', '/scanner')
  }

  return (
    <div className="page-content scanner-page">
      <PageHeader eyebrow="GUEST ADMISSION" title="Check-in scanner" description="Verify each invitation, greet the guest, then confirm their entry." />
      <div className={`connection-banner${online ? '' : ' offline'}`}>
        {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span>{online ? 'Connected to the event check-in service' : 'You’re offline. Verification and admission are unavailable.'}</span>
        <i />
      </div>

      <div className="scanner-layout">
        <section className="scanner-card">
          <div className="scanner-card-heading"><div><span className="eyebrow">STEP 01 · SCAN</span><h2>Read invitation QR</h2></div><span className="camera-status"><i />{scanning ? 'Camera on' : 'Ready'}</span></div>
          <div className={`camera-frame${scanning ? ' camera-active' : ''}`}>
            <video ref={videoRef} className={scanning ? 'video-visible' : ''} muted playsInline />
            {!scanning ? <div className="camera-placeholder"><span className="camera-symbol"><QrCode size={34} /></span><strong>Frame the guest’s QR code</strong><span>Hold it steady inside the camera area.</span></div> : null}
            {scanning ? <div className="scan-corners" aria-hidden="true"><i /><i /><i /><i /></div> : null}
          </div>
          <div className="camera-controls">
            {scanning ? <button className="button button-secondary" type="button" onClick={stopCamera}><CircleOff size={16} /> Stop camera</button> : <button className="button button-primary" type="button" onClick={startCamera} disabled={!online}><Camera size={17} /> Start camera</button>}
            <span>Camera access requires permission and a secure connection.</span>
          </div>
          <div className="manual-entry">
            <div className="manual-divider"><span />or enter QR content<span /></div>
            <form className="manual-form" onSubmit={submitManual}>
              <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Paste invitation URL or token" aria-label="Invitation URL or token" />
              <button className="button button-secondary" type="submit" disabled={!manualValue.trim() || !online || scanState === 'verifying'}>Verify</button>
            </form>
          </div>
        </section>

        <section className="verification-card" aria-live="polite">
          <div className="verification-heading"><span className="step-number">02</span><div><span className="eyebrow">STEP 02 · IDENTIFY</span><h2>Guest verification</h2></div></div>
          <VerificationPanel state={scanState} result={verification} confirmation={confirmation} message={message} online={online} onConfirm={confirmAdmission} onNext={resetScan} />
        </section>
      </div>
      <div className="scanner-reminder"><ShieldCheck size={17} /><span>Verification alone does not admit a guest. Confirm entry only after checking who is at the door.</span></div>
    </div>
  )
}

function VerificationPanel({
  state,
  result,
  confirmation,
  message,
  online,
  onConfirm,
  onNext,
}: {
  state: ScanState
  result: VerifyResponse | null
  confirmation: ConfirmResult | null
  message: string
  online: boolean
  onConfirm: () => void
  onNext: () => void
}) {
  if (state === 'idle') {
    return <div className="verification-empty"><span className="verification-empty-icon"><UserRoundCheck size={24} /></span><strong>Ready for a guest</strong><span>Scan an invitation to see guest details and validity here.</span></div>
  }
  if (state === 'verifying') {
    return <div className="verification-empty"><span className="spinner" /><strong>Checking invitation…</strong><span>Contacting the event check-in service.</span></div>
  }
  if (state === 'error') {
    return <div className="verification-result"><div className="result-symbol result-error"><AlertCircle size={23} /></div><h3>Couldn’t verify</h3><p>{message}</p><button className="button button-secondary button-full" type="button" onClick={onNext}><RotateCcw size={16} /> Try another scan</button></div>
  }
  if (state === 'confirm-error' && result?.status === 'VALID') {
    return <div className="verification-result"><div className="result-symbol result-error"><AlertCircle size={23} /></div><span className="result-overline">CONFIRMATION NOT RECEIVED</span><h3>{result.guestName}</h3><p>{message} Retrying uses the same request key, so an already-recorded entry won’t be duplicated.</p>{!online ? <div className="alert alert-error">Offline: reconnect before retrying.</div> : null}<button className="button button-primary button-full" type="button" onClick={onConfirm} disabled={!online}><RotateCcw size={16} /> Retry confirmation</button><button className="text-button" type="button" onClick={onNext}>Scan another invitation</button></div>
  }
  if (state === 'confirmed' && confirmation?.status === 'CONFIRMED') {
    return <div className="verification-result"><div className="result-symbol result-success"><CheckCircle2 size={25} /></div><span className="result-overline">ENTRY CONFIRMED</span><h3>{confirmation.guestName}</h3><p>Guest admitted at {new Date(confirmation.checkedInAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.</p><div className="confirmed-stamp"><Check size={15} /> Recorded successfully</div><button className="button button-primary button-full" type="button" onClick={onNext}><RotateCcw size={16} /> Scan next guest</button></div>
  }
  if (result?.status !== 'VALID') {
    const copy = result?.status === 'ALREADY_USED'
      ? ['Already admitted', 'This invitation has already been used. Do not admit again.']
      : result?.status === 'REVOKED'
        ? ['Invitation revoked', 'This QR is no longer active. Ask the administrator for help.']
        : ['Invalid invitation', 'No active invitation matches this QR code.']
    return <div className="verification-result"><div className="result-symbol result-error"><AlertCircle size={23} /></div><span className="result-overline">ENTRY NOT AUTHORIZED</span><h3>{copy[0]}</h3><p>{copy[1]}</p><button className="button button-secondary button-full" type="button" onClick={onNext}><RotateCcw size={16} /> Scan next guest</button></div>
  }
  return <div className="verification-result"><div className="result-symbol result-valid"><UserRoundCheck size={23} /></div><span className="result-overline">VALID INVITATION</span><h3>{result.guestName}</h3><p>Confirm this is the guest standing before you, then record their entry.</p><div className="pending-stamp"><span /> Awaiting guard confirmation</div>{!online ? <div className="alert alert-error">Offline: admission confirmation is disabled.</div> : null}<button className="button button-primary button-full confirm-button" type="button" onClick={onConfirm} disabled={!online}><Check size={17} /> Confirm entry</button><button className="text-button" type="button" onClick={onNext}>Not this guest · scan again</button></div>
}
