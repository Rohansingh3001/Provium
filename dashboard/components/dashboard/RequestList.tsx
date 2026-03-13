// components/dashboard/RequestList.tsx
'use client'
import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { useRegulatorRequests } from '@/lib/hooks/useRegulatorRequests'
import { Badge } from '@/components/ui/Badge'
import { formatBlock, truncateHash, timeAgo } from '@/lib/utils'
import { getExplorerTxUrl } from '@/lib/wagmi'
import { EnsAddress } from '@/components/EnsAddress'
import { X } from 'lucide-react'

export function RequestList() {
    const { allRequests, isLoading } = useRegulatorRequests()
    const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null)

    // Sort: pending at top, then newest fulfilled
    const sorted = [...allRequests].sort((a, b) => {
        if (a.fulfilled === b.fulfilled) {
            return Number(b.requestedAt) - Number(a.requestedAt)
        }
        return a.fulfilled ? 1 : -1
    })

    return (
        <Card className="h-full border-3 border-black shadow-[4px_4px_0_#1A1A1A]">
            <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Request History</span>
                    <Badge variant="gray">{allRequests.length} total</Badge>
                </div>
            </CardHeader>

            <div style={{ padding: 20 }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#6B6B6B' }}>
                        Loading requests...
                    </div>
                ) : sorted.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#6B6B6B', fontSize: 14 }}>
                        No compliance requests found on-chain.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {sorted.map((r) => (
                            <div
                                key={Number(r.requestId)}
                                style={{
                                    border: '2px solid #1A1A1A',
                                    borderRadius: 8,
                                    padding: 20,
                                    background: r.fulfilled ? 'white' : '#FFFBEB',
                                    transition: 'background 0.15s',
                                }}
                            >
                                {/* Header Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 800, fontSize: 15 }}>
                                                Request #{Number(r.requestId)}
                                            </span>
                                            {r.fulfilled ? (
                                                <Badge variant="green">Fulfilled</Badge>
                                            ) : (
                                                <Badge variant="yellow">Pending</Badge>
                                            )}
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 12, color: '#6B6B6B' }}>
                                            <EnsAddress address={r.requestor} /> · {timeAgo(r.requestedAt)}
                                        </div>
                                    </div>
                                    <Badge variant="pink">{r.jurisdiction}</Badge>
                                </div>

                                {/* Details Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6B6B6B', marginBottom: 2 }}>
                                            TARGET BLOCK
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 13, fontWeight: 600 }}>
                                            {Number(r.targetBlock) === 0 ? 'Latest' : formatBlock(r.targetBlock)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6B6B6B', marginBottom: 2 }}>
                                            DEADLINE
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: r.fulfilled ? '#1A1A1A' : '#EF4444' }}>
                                            {timeAgo(r.deadline)}
                                            {!r.fulfilled && ' (Active)'}
                                        </div>
                                    </div>
                                </div>

                                {/* FULFILLED View */}
                                {r.fulfilled && (
                                    <div style={{ background: '#F5F5F0', border: '1px solid #EBEBEB', borderRadius: 6, padding: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6B6B6B' }}>
                                                ZK PROOF HASH
                                            </span>
                                            <a
                                                href={getExplorerTxUrl(r.proofHash)}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 12, color: '#1D4ED8', textDecoration: 'underline' }}
                                            >
                                                {truncateHash(r.proofHash, 6)} ↗
                                            </a>
                                        </div>

                                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6B6B6B', marginBottom: 4 }}>
                                            AGENT REASONING
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                            <p
                                                style={{
                                                    fontSize: 13,
                                                    fontStyle: 'italic',
                                                    color: '#6B6B6B',
                                                    margin: 0,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}
                                                title={r.agentReasoning}
                                            >
                                                &quot;{r.agentReasoning}&quot;
                                            </p>
                                            <button
                                                onClick={() => setExpandedReasoning(r.agentReasoning)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#1A1A1A',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                Read
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reasoning Modal Overlay */}
            {expandedReasoning !== null && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        backdropFilter: 'blur(2px)',
                    }}
                    onClick={() => setExpandedReasoning(null)}
                >
                    <div
                        style={{
                            background: '#FFFBF0',
                            border: '2px solid #1A1A1A',
                            borderRadius: 12,
                            padding: 24,
                            maxWidth: 500,
                            width: '100%',
                            position: 'relative',
                            boxShadow: '4px 4px 0 #1A1A1A',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedReasoning(null)}
                            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B6B' }}
                        >
                            <X size={20} />
                        </button>
                        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Agent Reasoning</div>
                        <div style={{ fontSize: 15, lineHeight: 1.7, color: '#1A1A1A', marginBottom: 20 }}>
                            {expandedReasoning}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6B6B6B', borderTop: '1px solid #F0F0F0', paddingTop: 16 }}>
                            Stored on-chain on Base Sepolia forever.
                        </div>
                    </div>
                </div>
            )}
        </Card>
    )
}
