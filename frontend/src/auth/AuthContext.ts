import { createContext } from 'react'
import type { AuthUser } from '../api/types'

export const SESSION_KEY = 'wedding-checkin-session'

export interface Session {
  token: string
  user: AuthUser
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
