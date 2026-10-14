// Checks on Arc that a transaction really anchored a given record hash.
import { createPublicClient, decodeEventLog, defineChain, http, parseAbi } from 'viem'
import { config } from './config'

const arc = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [config.arcRpcUrl] } },
})

const client = createPublicClient({ chain: arc, transport: http(config.arcRpcUrl) })

const abi = parseAbi([
  'event RecordAnchored(bytes32 indexed recordHash, address indexed trader, uint256 timestamp)',
])

export type AnchorCheck = { ok: true } | { ok: false; reason: string }

export async function verifyAnchor(txHash: string, recordHash: string): Promise<AnchorCheck> {
  if (!config.registryAddress) {
    return { ok: false, reason: 'The registry contract is not configured on the server yet.' }
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { ok: false, reason: 'Invalid transaction hash.' }
  }

  let receipt
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
  } catch {
    return { ok: false, reason: 'Transaction not found yet on Arc. Wait a few seconds and try again.' }
  }

  if (receipt.status !== 'success') return { ok: false, reason: 'The transaction failed on Arc.' }
  if (receipt.to?.toLowerCase() !== config.registryAddress) {
    return { ok: false, reason: 'The transaction was not sent to the registry contract.' }
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== config.registryAddress) continue
    try {
      const ev = decodeEventLog({ abi, data: log.data, topics: log.topics })
      if (
        ev.eventName === 'RecordAnchored' &&
        ev.args.recordHash.toLowerCase() === recordHash.toLowerCase() &&
        ev.args.trader.toLowerCase() === config.traderAddress
      ) {
        return { ok: true }
      }
    } catch {
      // not our event, keep looking
    }
  }
  return { ok: false, reason: 'That transaction does not anchor this record.' }
                                                                }
