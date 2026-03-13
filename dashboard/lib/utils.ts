// lib/utils.ts
import { formatEther as viemFormatEther, formatUnits } from 'viem'

export function formatEther(value: bigint | undefined | null): string {
    if (value === undefined || value === null) return '–'
    try {
        const str = viemFormatEther(value)
        const num = parseFloat(str)
        return num.toFixed(2)
    } catch {
        return '–'
    }
}

export function formatUSDC(value: bigint | undefined | null): string {
    if (value === undefined || value === null) return '–'
    try {
        const str = formatUnits(value, 6)
        const num = parseFloat(str)
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    } catch {
        return '–'
    }
}

export function formatBps(bps: bigint | undefined | null): string {
    if (bps === undefined || bps === null) return '–'
    try {
        return (Number(bps) / 100).toFixed(1) + '%'
    } catch {
        return '–'
    }
}

export function bpsToPercent(bps: bigint | undefined | null): number {
    if (bps === undefined || bps === null) return 0
    return Number(bps) / 100
}

export function timeAgo(timestamp: bigint | undefined | null): string {
    if (timestamp === undefined || timestamp === null) return '–'
    const seconds = Math.floor(Date.now() / 1000) - Number(timestamp)
    if (seconds < 0) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

export function secondsSince(timestamp: bigint | undefined | null): number {
    if (timestamp === undefined || timestamp === null) return 999999
    const secs = Math.floor(Date.now() / 1000) - Number(timestamp)
    return Math.max(0, secs)
}

export function truncateHash(hash: string | undefined | null, chars = 6): string {
    if (!hash) return '–'
    if (hash.length <= chars * 2 + 5) return hash
    return `${hash.slice(0, chars + 2)}...${hash.slice(-4)}`
}

export function truncateAddress(
    address: string | undefined | null,
    chars = 4
): string {
    if (!address) return '–'
    return `${address.slice(0, chars + 2)}...${address.slice(-4)}`
}

export function formatBlock(block: bigint | number | undefined | null): string {
    if (block === undefined || block === null) return '–'
    return '#' + Number(block).toLocaleString('en-US')
}

export function triggerLabel(trigger: number): string {
    const labels: Record<number, string> = {
        0: 'routine',
        1: 'urgent',
        2: 'critical',
        3: 'regulator',
    }
    return labels[trigger] ?? 'unknown'
}

export function triggerBadgeVariant(
    trigger: number
): 'gray' | 'yellow' | 'red' | 'pink' {
    const variants: Record<number, 'gray' | 'yellow' | 'red' | 'pink'> = {
        0: 'gray',
        1: 'yellow',
        2: 'red',
        3: 'pink',
    }
    return variants[trigger] ?? 'gray'
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ')
}
