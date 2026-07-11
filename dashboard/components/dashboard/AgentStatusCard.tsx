// components/dashboard/AgentStatusCard.tsx
'use client'
import { useComplianceStatus } from '@/lib/hooks/useComplianceStatus'
import { Card } from '@/components/ui/Card'
import { PulsingDot } from '@/components/ui/PulsingDot'
import { timeAgo, formatBlock } from '@/lib/utils'
import { EnsAddress } from '@/components/EnsAddress'

export function AgentStatusCard() {
    const { secondsSinceLastProof, latestReport, reportCount, isLoading } = useComplianceStatus()

    // Active = proof submitted in last 10 min (gives room for 60-90s proof gen + 60s interval)
    // No reports yet = "Awaiting" (not "Paused" — agent may not have run)
    const hasReports = reportCount > 0
    const isActive = hasReports && secondsSinceLastProof < 600 // 10 min
    const statusLabel = !hasReports ? 'AWAITING FIRST PROOF' : isActive ? 'ACTIVE' : 'PAUSED'
    const agentAddress = process.env.NEXT_PUBLIC_AGENT_WALLET || '0x0000000000000000000000000000000000000000'

    return (
        <Card className={`mb-5 ${!hasReports ? '' : isActive ? 'card-accent-green' : 'card-accent-red'}`}>
            {/* Status banner strip */}
            <div
                style={{
                    background: !hasReports ? '#FFE500' : isActive ? '#00C896' : '#FF3B30',
                    borderBottom: '3px solid #1A1A1A',
                    padding: '8px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <PulsingDot color={!hasReports ? 'yellow' : isActive ? 'green' : 'red'} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#1A1A1A' }}>
                    {statusLabel}
                </span>
            </div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '28px 32px',
                    flexWrap: 'wrap',
                    gap: 20,
                }}
            >
                {/* Left Section */}
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: '#6B6B6B',
                            marginBottom: 8,
                        }}
                    >
                        AUTONOMOUS AGENT
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                            style={{
                                fontSize: 20,
                                fontWeight: 800,
                                color: '#1A1A1A',
                            }}
                        >
                            {statusLabel}
                        </span>
                    </div>

                    <div
                        style={{
                            fontFamily: 'var(--font-dm-mono)',
                            fontSize: 13,
                            color: '#6B6B6B',
                            marginTop: 4,
                        }}
                    >
                        <EnsAddress address={agentAddress as `0x${string}`} />
                    </div>
                </div>

                {/* Center Section */}
                <div style={{ flex: 1, minWidth: 200, textAlign: 'center' }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: '#6B6B6B',
                            marginBottom: 8,
                        }}
                    >
                        LAST PROOF
                    </div>

                    {isLoading ? (
                        <div className="skeleton" style={{ width: 100, height: 36, margin: '0 auto' }} />
                    ) : (
                        <div
                            style={{
                                fontSize: 36,
                                fontWeight: 900,
                                color: '#1A1A1A',
                                lineHeight: 1,
                            }}
                        >
                            {timeAgo(latestReport?.timestamp)}
                        </div>
                    )}

                    <div
                        style={{
                            fontFamily: 'var(--font-dm-mono)',
                            fontSize: 13,
                            color: '#6B6B6B',
                            marginTop: 8,
                        }}
                    >
                        Report #{latestReport ? Number(latestReport.reportId) : '–'} · Block{' '}
                        {formatBlock(latestReport?.blockNumber)}
                    </div>
                </div>

                {/* Right Section */}
                <div style={{ flex: 1, minWidth: 240, textAlign: 'right' }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: '#6B6B6B',
                            marginBottom: 8,
                        }}
                    >
                        LATEST REASONING
                    </div>

                    {isLoading ? (
                        <div className="skeleton" style={{ width: '100%', height: 40 }} />
                    ) : (
                        <p
                            style={{
                                fontSize: 13,
                                fontStyle: 'italic',
                                color: '#6B6B6B',
                                lineHeight: 1.5,
                                margin: 0,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                            title={latestReport?.agentReasoning}
                        >
                            &quot;{latestReport?.agentReasoning || 'No proofs recorded yet.'}&quot;
                        </p>
                    )}

                    <a
                        href="/dashboard/proofs"
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#FF90E8',
                            textDecoration: 'underline',
                            display: 'inline-block',
                            marginTop: 8,
                        }}
                    >
                        Full report ↗
                    </a>
                </div>
            </div>
        </Card>
    )
}
