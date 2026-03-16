import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

export interface AuthState {
  user: User | null
  loading: boolean
  signInError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signInError, setSignInError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const handleSignIn = async () => {
    setSignInError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      console.error('[Auth] sign in failed:', err)
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed — not an error worth showing
        return
      }
      if (code === 'auth/unauthorized-domain') {
        setSignInError('This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.')
      } else {
        setSignInError(`Sign in failed (${code || 'unknown error'}). Check the console for details.`)
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      console.error('[Auth] sign out failed:', err)
    }
  }

  return { user, loading, signInError, signIn: handleSignIn, signOut: handleSignOut }
}
