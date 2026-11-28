import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Session } from './AuthContext'
import { SESSION_KEY, AuthContext } from './AuthContext'

function readSession(): Session | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null')
    if (
      typeof value === 'object' &&
      value !== null &&
      'token' in value &&
      typeof value.token === 'string' &&
      'user' in value &&
      typeof value.user === 'object' &&
      value.user !== null &&
      'id' in value.user &&
      typeof value.user.id === 'string' &&
      'username' in value.user &&
      typeof value.user.username === 'string' &&
      'role' in value.user &&
      (value.user.role === 'ADMIN' || value.user.role === 'GUARD')
    ) {
      return {
        token: value.token,
        user: {
          id: value.user.id,
          username: value.user.username,
          role: value.user.role,
        },
      }
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const signIn = useCallback(async (username: string, password: string) => {
    const nextSession = await api.login(username, password)
    const value = { token: nextSession.accessToken, user: nextSession.user }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value))
    setSession(value)
  }, [])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  const contextValue = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
