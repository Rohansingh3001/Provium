// components/dashboard/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileCheck, Scale, AlertTriangle, BookOpen, Trophy } from 'lucide-react'
import { BASE_SEPOLIA_EXPLORER } from '@/lib/wagmi'
import Image from 'next/image'
import { PulsingDot } from '@/components/ui/PulsingDot'
import { EnsAddress } from '@/components/EnsAddress'
import { useNotificationStore } from '@/lib/store'

const navigation = [
    { name: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
    { name: 'Proof History', href: '/dashboard/proofs', icon: FileCheck },
    { name: 'Regulator Portal', href: '/dashboard/regulator', icon: Scale },
    { name: 'Simulate', href: '/dashboard/simulate', icon: AlertTriangle },
    { name: 'Bounty Tracks', href: '/dashboard/tracks', icon: Trophy },
    { name: 'Help & Docs', href: '/dashboard/docs', icon: BookOpen },
]

export function Sidebar() {
    const pathname = usePathname()
    const agentAddress = process.env.NEXT_PUBLIC_AGENT_WALLET || '0x0000000000000000000000000000000000000000'
    const newProofCount = useNotificationStore((s) => s.newProofCount())

    return (
        <div
            style={{
                width: 272,
                height: '100%',
                background: '#FFFBF0',
                borderRight: '3px solid #1A1A1A',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Logo */}
            <div
                style={{
                    height: 72,
                    borderBottom: '3px solid #1A1A1A',
                    padding: '0 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 24, height: 24, position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
                        <Image src="/logo.svg" alt="Provium Logo" fill style={{ objectFit: 'contain' }} />
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>Provium</span>
                </div>
                <span
                    style={{
                        background: '#FFE500',
                        border: '2px solid #1A1A1A',
                        boxShadow: '2px 2px 0 #1A1A1A',
                        color: '#1A1A1A',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginLeft: 'auto',
                    }}
                >
                    Base Testnet
                </span>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, padding: '20px 14px' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`nav-link ${isActive ? 'active' : ''}`}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <item.icon size={18} strokeWidth={2.5} />
                                        {item.name}
                                    </span>
                                    {item.href === '/dashboard/proofs' && newProofCount > 0 && (
                                        <span style={{
                                            background: '#FF3B30',
                                            color: 'white',
                                            fontSize: 10,
                                            fontWeight: 800,
                                            minWidth: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 5px',
                                            border: '1.5px solid white',
                                            letterSpacing: 0,
                                        }}>
                                            {newProofCount > 99 ? '99+' : newProofCount}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Agent status */}
            <div style={{ borderTop: '3px solid #1A1A1A', padding: 20, background: '#1A1A1A' }}>
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        color: '#FFE500',
                        marginBottom: 4,
                    }}
                >
                    AGENT WALLET
                </div>
                <div
                    style={{
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 12,
                        color: '#FFFBF0',
                        marginBottom: 8,
                    }}
                >
                    <EnsAddress address={agentAddress as `0x${string}`} truncate={8} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <PulsingDot color="green" size="sm" />
                    <span style={{ fontSize: 12, color: '#00C896', fontWeight: 600 }}>Live on Base Sepolia</span>
                </div>
                <a
                    href={`${BASE_SEPOLIA_EXPLORER}/address/${agentAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        fontSize: 12,
                        color: '#FF90E8',
                        textDecoration: 'underline',
                    }}
                >
                    View on Basescan ↗
                </a>
            </div>
        </div>
    )
}
