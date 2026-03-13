import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { baseSepolia, mainnet } from 'wagmi/chains'

export const config = getDefaultConfig({
    appName: 'Provium',
    projectId: '4c8bbf33e89fb23d069b8214f4b2fd70', // Public generic WC project ID for hackathons
    chains: [baseSepolia, mainnet],
    ssr: true,
    transports: {
        [baseSepolia.id]: http(
            process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'
        ),
        [mainnet.id]: http(), // ENS resolution
    },
})

export const BASE_SEPOLIA_CHAIN_ID = baseSepolia.id // 84532
export const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org'

export function getExplorerTxUrl(hash: string): string {
    return `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`
}

export function getExplorerBlockUrl(block: bigint | number): string {
    return `${BASE_SEPOLIA_EXPLORER}/block/${block}`
}

export function getExplorerAddressUrl(address: string): string {
    return `${BASE_SEPOLIA_EXPLORER}/address/${address}`
}

export function truncateHash(hash: string, chars = 6): string {
    if (!hash || hash.length < 12) return hash ?? '–'
    return `${hash.slice(0, chars + 2)}...${hash.slice(-4)}`
}

export function truncateAddress(address: string, chars = 4): string {
    if (!address || address.length < 12) return address ?? '–'
    return `${address.slice(0, chars + 2)}...${address.slice(-4)}`
}
