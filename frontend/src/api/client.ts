import type {
  AuthUser,
  ConfirmResult,
  DashboardStatistics,
  Guest,
  ImportResult,
  IssuedInvitation,
  LoginResponse,
  VerifyResponse,
} from './types'

// const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const API_BASE = 'http://localhost:3000/api'
export class ApiError extends Error {
  readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('Cannot reach the API. Check that the backend is running.', 0)
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? readErrorMessage(body.error)
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return response.json() as Promise<T>
}

function readErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
  }
  return 'The request could not be completed.'
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: (token: string) => request<AuthUser>('/auth/me', {}, token),

  guests: (
    token: string,
    filters: { search?: string; status?: string },
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status && filters.status !== 'all') params.set('status', filters.status)
    const query = params.size ? `?${params.toString()}` : ''
    return request<Guest[]>(`/guests${query}`, { signal }, token)
  },

  statistics: (token: string) =>
    request<DashboardStatistics>('/dashboard/statistics', {}, token),

  registerGuest: (token: string, input: { fullName: string; phoneNumber: string }) =>
    request<IssuedInvitation>(
      '/guests',
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),

  updateGuest: (
    token: string,
    guestId: string,
    input: { fullName: string; phoneNumber: string },
  ) =>
    request<Guest>(
      `/guests/${guestId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      token,
    ),

  issueInvitation: (token: string, guestId: string) =>
    request<IssuedInvitation>(
      `/invitations/guest/${guestId}/issue`,
      { method: 'POST' },
      token,
    ),

  reissueInvitation: (token: string, guestId: string, reason: string) =>
    request<IssuedInvitation>(
      `/invitations/guest/${guestId}/reissue`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token,
    ),

  revokeInvitation: (token: string, guestId: string, reason: string) =>
    request<{ status: 'REVOKED' }>(
      `/invitations/guest/${guestId}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token,
    ),

  importGuests: (token: string, file: File) => {
    const form = new FormData()
    form.set('file', file)
    return request<ImportResult>(
      '/invitations/import',
      { method: 'POST', body: form },
      token,
    )
  },

  verify: (token: string, qrToken: string) =>
    request<VerifyResponse>(
      '/check-ins/verify',
      { method: 'POST', body: JSON.stringify({ token: qrToken }) },
      token,
    ),

  confirm: (token: string, qrToken: string, idempotencyKey: string) =>
    request<ConfirmResult>(
      '/check-ins/confirm',
      {
        method: 'POST',
        body: JSON.stringify({ token: qrToken, idempotencyKey }),
      },
      token,
    ),

  downloadQr: async (token: string, invitationId: string) => {
    const response = await fetch(`${API_BASE}/invitations/${invitationId}/qr`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'image/png' },
    }).catch(() => {
      throw new ApiError('Cannot reach the API. Check that the backend is running.', 0)
    })
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      const message =
        typeof body === 'object' && body !== null && 'error' in body
          ? readErrorMessage(body.error)
          : `QR download failed (${response.status})`
      throw new ApiError(message, response.status)
    }

    return {
      blob: await response.blob(),
      fileName: filenameFromHeader(response.headers.get('Content-Disposition')),
    }
  },

  downloadCard: async (token: string, invitationId: string) => {
    const response = await fetch(`${API_BASE}/invitations/${invitationId}/card`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'image/png' },
    }).catch(() => {
      throw new ApiError('Cannot reach the API. Check that the backend is running.', 0)
    })
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      const message =
        typeof body === 'object' && body !== null && 'error' in body
          ? readErrorMessage(body.error)
          : `Invitation card download failed (${response.status})`
      throw new ApiError(message, response.status)
    }

    return {
      blob: await response.blob(),
      fileName: filenameFromHeader(response.headers.get('Content-Disposition')),
    }
  },

  downloadAllQr: async (token: string) => {
    const response = await fetch(`${API_BASE}/invitations/qr/all`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/zip' },
    }).catch(() => {
      throw new ApiError('Cannot reach the API. Check that the backend is running.', 0)
    })
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      const message =
        typeof body === 'object' && body !== null && 'error' in body
          ? readErrorMessage(body.error)
          : `QR archive download failed (${response.status})`
      throw new ApiError(message, response.status)
    }
    return response.blob()
  },
}

function filenameFromHeader(header: string | null): string {
  const match = header?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? 'guest-invitation.png'
}

export function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
