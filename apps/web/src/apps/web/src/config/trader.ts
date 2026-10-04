// The registered trader wallet. This address is public, so it is safe to commit.
// This only hides the Trader page in the interface. Real protection comes in Phase 3.
export const TRADER_ADDRESS = '0x6b4b4d8d366c574029e9d5470e6b7ab22df9a382'

export function isTrader(address?: string): boolean {
  return (
    TRADER_ADDRESS !== '' &&
    !!address &&
    address.toLowerCase() === TRADER_ADDRESS.toLowerCase()
  )
}
