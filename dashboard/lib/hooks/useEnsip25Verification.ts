/**
 * useEnsip25Verification.ts
 *
 * ENSIP-25: AI Agent Registry ENS Name Verification
 * https://docs.ens.domains/ensip/25/
 *
 * This hook resolves the ENSIP-25 parameterized text record for a given
 * ENS name, registry contract address, and agent identifier.
 *
 * Text record key format:
 *   agent-registration[<erc7930Registry>][<agentId>]
 *
 * Verification rule (ENSIP-25 §4.1):
 *   The text record value MUST be non-empty for verification to pass.
 *   Clients MUST NOT depend on the specific value beyond it being non-empty.
 *   Implementations SHOULD set the value to "1".
 *
 * ERC-7930 encoding for EIP-155 EVM chains:
 *   0x0001 | 0000 | <chainIdByteLen:1B> | <chainId:NB big-endian>
 *          | 0x14 | <address:20B>
 *
 * Reference example (Ethereum mainnet, chain 1):
 *   Registry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 *   ERC-7930: 0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432
 */

'use client'

import { useEnsText } from 'wagmi'
import { mainnet } from 'wagmi/chains'

// ── ERC-7930 encoding ──────────────────────────────────────────────────────

/**
 * Encode a contract address as an ERC-7930 interoperable address
 * for EIP-155 EVM chains.
 *
 * Format:
 *   0x | 0001 (EIP-155 ns) | 0000 (reserved) | <chainIdLen:1B>
 *      | <chainIdBigEndian:NB> | 14 (addrLen) | <address:20B>
 */
export function encodeErc7930Address(chainId: number, address: string): string {
    const addr = address.toLowerCase().replace(/^0x/, '')
    if (addr.length !== 40) {
        throw new Error(`Expected 20-byte address (40 hex chars), got: ${address}`)
    }

    // Encode chain ID as minimal big-endian bytes (strip leading zero bytes, min 1 byte)
    let chainHex = chainId.toString(16)
    if (chainHex.length % 2 !== 0) chainHex = '0' + chainHex
    const chainByteLen = chainHex.length / 2

    const encoded =
        '0001'                                       // EIP-155 namespace type
        + '0000'                                     // reserved / outer TLV header
        + chainByteLen.toString(16).padStart(2, '0') // chain ID length (1 byte)
        + chainHex                                   // chain ID (big-endian, minimal)
        + '14'                                       // address length = 20 (0x14)
        + addr                                       // 20-byte address

    return '0x' + encoded
}

/**
 * Build the ENSIP-25 text record key string.
 *
 * Returns: `agent-registration[<erc7930Registry>][<agentId>]`
 */
export function buildEnsip25TextKey(
    registryAddress: string,
    agentId: string,
    chainId: number,
): string {
    const erc7930 = encodeErc7930Address(chainId, registryAddress)
    return `agent-registration[${erc7930}][${agentId}]`
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface Ensip25VerificationResult {
    /** True when the text record exists and is non-empty (ENSIP-25 §4.1). */
    verified: boolean
    /** The raw text record value ('1' when verified, undefined if not set). */
    rawValue: string | null | undefined
    /** The full text record key that was resolved. */
    textKey: string
    /** The ERC-7930 encoded registry address used in the key. */
    erc7930Registry: string
    /** True while the ENS resolver is loading. */
    isLoading: boolean
    /** Error from the ENS resolver, if any. */
    error: Error | null
}

export interface UseEnsip25VerificationArgs {
    /** ENS name to verify (e.g. "provium-agent.eth"). */
    ensName?: string
    /** Registry contract address (our ComplianceRegistry on Base Sepolia). */
    registryAddress: string
    /** Agent ID as registered in the registry (default: "1"). */
    agentId?: string
    /** Chain ID where the registry is deployed (default: 84532 = Base Sepolia). */
    registryChainId?: number
}

/**
 * useEnsip25Verification
 *
 * Resolves the ENSIP-25 verification text record for an ENS name.
 * Verification is performed on Ethereum mainnet (ENS lives on mainnet).
 * The registry is on Base Sepolia — its address is ERC-7930 encoded into the key.
 *
 * Usage:
 *   const { verified, textKey, isLoading } = useEnsip25Verification({
 *     ensName: 'provium-agent.eth',
 *     registryAddress: '0x...',   // ComplianceRegistry on Base Sepolia
 *     agentId: '1',
 *   })
 */
export function useEnsip25Verification({
    ensName,
    registryAddress,
    agentId = '1',
    registryChainId = 84532,  // Base Sepolia
}: UseEnsip25VerificationArgs): Ensip25VerificationResult {
    let textKey = ''
    let erc7930Registry = ''
    let buildError: Error | null = null

    try {
        erc7930Registry = encodeErc7930Address(registryChainId, registryAddress)
        textKey = `agent-registration[${erc7930Registry}][${agentId}]`
    } catch (e) {
        buildError = e instanceof Error ? e : new Error(String(e))
    }

    const {
        data: rawValue,
        isLoading,
        error: resolverError,
    } = useEnsText({
        name: ensName ?? undefined,
        key: textKey,
        chainId: mainnet.id,   // ENS always resolves on mainnet
        query: {
            enabled: !!ensName && !!textKey && !buildError,
        },
    })

    // ENSIP-25 §4.1: verified iff the resolved value is non-empty
    const verified = !buildError && !resolverError && Boolean(rawValue && rawValue.trim())

    return {
        verified,
        rawValue,
        textKey,
        erc7930Registry,
        isLoading,
        error: buildError ?? resolverError ?? null,
    }
}
