export type UserRole = 'ADMIN' | 'GUARD'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface Guest {
  id: string
  fullName: string
  phoneNumber: string
  createdAt: string
  invitationId: string | null
  invitationStatus: 'ACTIVE' | 'REVOKED' | null
  checkedInAt: string | null
  qrDownloadUrl: string | null
}

export interface IssuedInvitation {
  guest: Pick<Guest, 'id' | 'fullName' | 'phoneNumber'>
  invitation: { id: string; qrFileName: string }
  qrDownloadUrl: string
}

export interface DashboardStatistics {
  totalGuests: number
  admitted: number
  notAdmitted: number
  revoked: number
}

export interface VerificationResult {
  status: 'VALID'
  invitationId: string
  guestName: string
}

export interface RejectedVerification {
  status: 'INVALID' | 'REVOKED' | 'ALREADY_USED'
}

export type VerifyResponse = VerificationResult | RejectedVerification

export interface ConfirmResponse {
  status: 'CONFIRMED'
  guestName: string
  checkedInAt: string
}

export type ConfirmResult =
  | ConfirmResponse
  | { status: 'INVALID' | 'REVOKED' | 'ALREADY_USED' }

export interface ImportResult {
  successful: IssuedInvitation[]
  failed: Array<{ row: number; error: string }>
}
