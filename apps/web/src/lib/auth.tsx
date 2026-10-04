import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { verifyMessage } from 'viem'

type AuthState = {
  address: `0x${string}` | undefined // set only after a verified signature
  connectedAddress: `0x${string}` | undefined // connected, but not necessarily signed in
  isSignedIn: boolean
  busy: boolean
  error: string
  signIn: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function buildMessage(address: string, nonce: string, issuedAt: string): string {
  return [
    'Sign in to OpenRisk',
    '',
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt}`,
    '',
    'This signature proves you own this wallet. It costs no gas, sends no funds, and gives OpenRisk no access to your assets.',
  ].join('\n')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address: connected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const [signedAddress, setSignedAddress] = useState<`0x${string}` | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const attempted = useRef<string | undefined>(undefined)

  async function signIn() {
    if (!connected || busy) return
    setBusy(true)
    setError('')
    try {
      const message = buildMessage(connected, crypto.randomUUID(), new Date().toISOString())
      const signature = await signMessageAsync({ message })
      const ok = await verifyMessage({ address: connected, message, signature })
      if (!ok) throw new Error('mismatch')
      setSignedAddress(connected)
    } catch (e) {
      const text = e instanceof Error ? e.message : ''
      setError(/reject|denied|cancel/i.test(text) ? 'Signature was rejected.' : 'Could not sign in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    attempted.current = connected
    setSignedAddress(undefined)
    setError('')
    disconnect()
  }

  // If the wallet account changes or disconnects, the old sign-in no longer applies.
  useEffect(() => {
    if (signedAddress && signedAddress.toLowerCase() !== connected?.toLowerCase()) {
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
