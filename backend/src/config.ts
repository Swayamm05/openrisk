function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: required('JWT_SECRET'),
  traderAddress: required('TRADER_ADDRESS').toLowerCase(),
  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  priceMonitor: (process.env.PRICE_MONITOR ?? 'off') === 'on',
  // Arc mainnet. The default RPC is from docs.arc.io. The registry address is
  // set in the host's environment after the contract is deployed.
  arcRpcUrl: process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io',
  registryAddress: (process.env.REGISTRY_ADDRESS ?? '').trim().toLowerCase(),
}
