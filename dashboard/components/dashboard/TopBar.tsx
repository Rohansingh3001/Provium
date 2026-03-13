// components/dashboard/TopBar.tsx
'use client'
import { usePathname } from 'next/navigation'
import { useComplianceStatus } from '@/lib/hooks/useComplianceStatus'
import { PulsingDot } from '@/components/ui/PulsingDot'
import { Badge } from '@/components/ui/Badge'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import { LogOut } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export function TopBar() {
    const pathname = usePathname()
    const { isCompliant, secondsSinceLastProof, latestReport, reportCount, isLoading } = useComplianceStatus()
    const { address, isConnected } = useAccount()
    const { disconnect } = useDisconnect()

    // Extract page title from path
    const paths = pathname.split('/').filter(Boolean)
    const lastPath = paths[paths.length - 1] || 'overview'
    const titleMap: Record<string, string> = {
        overview: 'Overview',
        proofs: 'Proof History',
        regulator: 'Regulator Portal',
        simulate: 'Violation Simulator',
    }
    const title = titleMap[lastPath] ?? lastPath.charAt(0).toUpperCase() + lastPath.slice(1)

    const hasReports = reportCount > 0
    const isAgentActive = hasReports && secondsSinceLastProof < 600 // 10 min

    return (
        <div
            style={{
                height: 72,
                background: '#FFFBF0',
                borderBottom: '3px solid #1A1A1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 32px',
                flexShrink: 0,
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                {/* Status Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {isLoading ? (
                        <div className="skeleton" style={{ width: 300, height: 24 }} />
                    ) : (
                        <>
                            {/* Agent Active */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 14px',
                                    border: '2px solid #1A1A1A',
                                    borderRadius: 4,
                                    boxShadow: '2px 2px 0 #1A1A1A',
                                    background: !hasReports ? '#F5F5F0' : isAgentActive ? '#00C896' : '#FF3B30',
                                }}
                            >
                                <PulsingDot color={!hasReports ? 'yellow' : isAgentActive ? 'green' : 'red'} />
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        letterSpacing: '0.5px',
                                        color: !hasReports ? '#6B6B6B' : '#1A1A1A',
                                    }}
                                >
                                    {!hasReports ? 'Awaiting first proof' : isAgentActive ? 'Agent Active' : 'Agent Paused'}
                                </span>
                            </div>

                            {/* Separator */}
                            <div style={{ width: 3, height: 20, background: '#1A1A1A', borderRadius: 2 }} />
                            <div
                                style={{
                                    fontFamily: 'var(--font-dm-mono)',
                                    fontSize: 12,
                                    color: '#6B6B6B',
                                }}
                            >
                                Last proof: {timeAgo(latestReport?.timestamp)}
                            </div>

                            {/* Separator */}
                            <div style={{ width: 3, height: 20, background: '#1A1A1A', borderRadius: 2 }} />

                            {/* Global compliance status */}
                            <Badge variant={isCompliant ? 'green' : 'red'}>
                                ● {isCompliant ? 'COMPLIANT' : 'VIOLATION'}
                            </Badge>
                        </>
                    )}
                </div>

                {/* Wallet */}
                {isConnected && address ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        {/* Address chip */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                background: '#1A1A1A',
                                border: '2px solid #1A1A1A',
                                borderRight: 'none',
                                borderRadius: '4px 0 0 4px',
                                fontFamily: 'var(--font-dm-mono)',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#FFE500',
                                letterSpacing: '0.5px',
                                boxShadow: '3px 3px 0 #1A1A1A',
                            }}
                        >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896', flexShrink: 0 }} />
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                        {/* Disconnect button */}
                        <button
                            onClick={() => disconnect()}
                            title="Disconnect wallet"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 10px',
                                background: '#FF3B30',
                                border: '2px solid #1A1A1A',
                                borderRadius: '0 4px 4px 0',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 800,
                                color: 'white',
                                letterSpacing: '0.5px',
                                boxShadow: '3px 3px 0 #1A1A1A',
                                height: '100%',
                            }}
                        >
                            <LogOut size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                ) : (
                    <ConnectButton
                        chainStatus="none"
                        showBalance={false}
                        accountStatus="address"
                    />
                )}
            </div>
        </div>
    )
}
