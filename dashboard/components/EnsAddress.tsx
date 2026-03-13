// components/EnsAddress.tsx
'use client'
import { useEnsName } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { truncateAddress } from '@/lib/wagmi'

interface EnsAddressProps {
    address: `0x${string}` | undefined
    className?: string
    truncate?: number
}

/**
 * Resolves an ENS name on Ethereum mainnet.
 * Falls back to a truncated 0x address.
 * Shows ENS name when available, with address as fallback.
 *
 * Demo: "zkcomply-agent.eth" instead of "0x4f2a...8c3b"
 */
export function EnsAddress({ address, className = '', truncate = 4 }: EnsAddressProps) {
    const { data: ensName, isLoading } = useEnsName({
        address,
        chainId: mainnet.id,
    })

    if (!address) return <span className={className}>–</span>

    if (isLoading) {
        return (
            <span className={className} title={address}>
                {truncateAddress(address, truncate)}…
            </span>
        )
    }

    // Show ENS name if available, otherwise truncated address
    const display = ensName ?? truncateAddress(address, truncate)

    return (
        <span className={className} title={address}>
            {display}
        </span>
    )
}
