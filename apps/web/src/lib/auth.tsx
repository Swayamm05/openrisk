import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { api, setToken } from './api'

type AuthState = {
  address: `0x${string}` | undefined // set only after the server verifies the signature
  connectedAddress: `0x${string}` | undefined
  isSignedIn: boolean
  isTrader: boolean // decided by the server, not by the browser
  busy: boolean
  error: string
  signIn: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address: connected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const [signedAddress, setSignedAddress] = useState<`0x${string}` | undefined>()
  const [trader, setTrader] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const attempted = useRef<string | undefined>(undefined)

  async function signIn() {
    if (!connected || busy) return
    setBusy(true)
    setError('')
    try {
      const { message } = await api.nonce(connected)
      const signature = await signMessageAsync({ message })
      const result = await api.verify(connected, signature)
      setToken(result.token)
      setTrader(result.isTrader)
      setSignedAddress(connected)
    } catch (e) {
      const text = e instanceof Error ? e.message : ''
      if (/reject|denied|cancel/i.test(text)) setError('Signature was rejected.')
      else if (/failed to fetch|networkerror/i.test(text)) {
        setError('Could not reach the server. It may be waking up, so try again in a minute.')
      } else setError(text || 'Could not sign in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    attempted.current = connected
    setToken('')
    setTrader(false)
    setSignedAddress(undefined)
    setError('')
    disconnect()
  }

  // If the wallet account changes or disconnects, the old sign-in no longer applies.
  useEffect(() => {
    if (signedAddress && signedAddress.toLowerCase() !== connected?.toLowerCase()) {
      setToken('')
      setTrader(false)
      setSignedAddress(undefined)
    }
  }, [connected, signedAddress])

  // Ask for the signature automatically, once per connected account.
  useEffect(() => {
    if (!connected) {
      attempted.current = undefined
      return
    }
    if (!signedAddress && attempted.current !== connected) {
      attempted.current = connected
      void signIn()
    }
  }, [connected])

  const value: AuthState = {
    address: signedAddress,
    connectedAddress: connected,
    isSignedIn: !!signedAddress,
    isTrader: trader,
    busy,
    error,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
