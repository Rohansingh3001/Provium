// components/dashboard/AgentBrainFeed.tsx
'use client'
import { useEffect, useRef } from 'react'
import { useAgentFeed } from '@/lib/hooks/useAgentFeed'
import { timeAgo, bpsToPercent, truncateHash, formatBlock } from '@/lib/utils'
import { getExplorerTxUrl } from '@/lib/wagmi'
import { PulsingDot } from '@/components/ui/PulsingDot'
import { EnsAddress } from '@/components/EnsAddress'

function FeedLine({ event }: { event: any }) {
    const time = timeAgo(BigInt(event.timestamp / 1000))

    switch (event.type) {
        case 'proof_submitted':
            return (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }} className="feed-event">
                    <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontSize: 11 }}>{time}</span>
                    <span style={{ color: '#34D399', fontWeight: 600, flexShrink: 0, fontSize: 11 }}>[PROOF]</span>
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 1.5 }}>
                        Report #{event.reportId} · {event.isCompliant ? 'Compliant' : 'VIOLATION'} · Ratio {bpsToPercent(event.ratioBps).toFixed(1)}% ·{' '}
                        <a
                            href={getExplorerTxUrl(event.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#60A5FA', textDecoration: 'underline' }}
                        >
                            tx {truncateHash(event.txHash, 4)} ↗
                        </a>
                        {event.agentReasoning && (
                            <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: 11 }}>
                                &quot;{event.agentReasoning}&quot;
                            </div>
                        )}
                    </span>
                </div>
            )
        case 'violation_recorded':
            return (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }} className="feed-event">
                    <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontSize: 11 }}>{time}</span>
                    <span style={{ color: '#EF4444', fontWeight: 800, flexShrink: 0, fontSize: 11 }}>[VIOLATION]</span>
                    <span style={{ color: '#FECACA', fontSize: 11, lineHeight: 1.5, fontWeight: 500 }}>
                        Report #{event.reportId} · Ratio {bpsToPercent(event.ratioBps).toFixed(1)}% below 150% minimum
                        <div style={{ marginTop: 4 }}>
                            <a
                                href={getExplorerTxUrl(event.txHash)}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#FCA5A5', textDecoration: 'underline' }}
                            >
                                tx {truncateHash(event.txHash, 4)} ↗
                            </a>
                        </div>
                    </span>
                </div>
            )
        case 'request_fulfilled':
            return (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }} className="feed-event">
                    <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontSize: 11 }}>{time}</span>
                    <span style={{ color: '#FF90E8', fontWeight: 600, flexShrink: 0, fontSize: 11 }}>[REQUEST]</span>
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 1.5 }}>
                        Request #{event.requestId} fulfilled ·{' '}
                        <a
                            href={getExplorerTxUrl(event.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#FF90E8', textDecoration: 'underline' }}
                        >
                            tx {truncateHash(event.txHash, 4)} ↗
                        </a>
                    </span>
                </div>
            )
        default:
            return null
    }
}

export function AgentBrainFeed() {
    const { events, isWatching } = useAgentFeed()
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Auto-scroll to bottom of events box when new events arrive
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [events])

    return (
        <div
            style={{
                background: '#0D0D0D',
                border: '2px solid #1A1A1A',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '4px 4px 0 #1A1A1A',
            }}
        >
            {/* Header */}
            <div
                style={{
                    background: '#111',
                    borderBottom: '1px solid #333',
                    padding: '14px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} title="Close" />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} title="Minimize" />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} title="Maximize" />
                </div>
                <PulsingDot color={isWatching ? 'green' : 'red'} />
                <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>
                    Live Agent Feed
                </span>
                <span
                    style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.3)',
                    }}
                >
                    Events: {events.length}/20
                </span>
            </div>

            {/* Body */}
            <div
                ref={scrollRef}
                style={{
                    padding: 28,
                    minHeight: 280,
                    maxHeight: 400,
                    overflowY: 'auto',
                    fontFamily: 'var(--font-dm-mono)',
                }}
                className="terminal-body"
            >
                {events.length === 0 ? (
                    <div
                        style={{
                            height: 240,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.25)',
                            fontSize: 13,
                            gap: 12,
                        }}
                    >
                        <span style={{ fontFamily: 'var(--font-dm-mono)' }}>$ watching ComplianceRegistry...</span>
                        <span style={{ fontSize: 12 }}>Proofs and regulator fulfillments will appear here.</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
                        {/* ⇧ Because events array is prepended, we display flex-column-reverse so newest is at bottom */}
                        {events.map((e) => (
                            <FeedLine key={e.id} event={e} />
                        ))}
                    </div>
                )}

                {/* Cursor anchor line */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>
                        ●{' '}
                        <EnsAddress
                            address={(process.env.NEXT_PUBLIC_AGENT_WALLET || '0x0000000000000000000000000000000000000000') as `0x${string}`}
                        />
                    </span>
                    <span className="cursor-blink" style={{ width: 6, height: 12, background: 'rgba(255,255,255,0.25)' }} />
                </div>
            </div>
        </div>
    )
}
