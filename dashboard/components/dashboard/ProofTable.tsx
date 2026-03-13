// components/dashboard/ProofTable.tsx
'use client'
import { useState } from 'react'
import { useProofHistory } from '@/lib/hooks/useProofHistory'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatBps, truncateHash, triggerBadgeVariant, triggerLabel, formatBlock } from '@/lib/utils'
import { getExplorerTxUrl, getExplorerBlockUrl } from '@/lib/wagmi'
import { X } from 'lucide-react'

type FilterType = 'all' | 'routine' | 'violations' | 'regulator'

export function ProofTable() {
    const { reports, isLoading } = useProofHistory()
    const [page, setPage] = useState(0)
    const [filter, setFilter] = useState<FilterType>('all')
    const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null)

    const ITEMS_PER_PAGE = 10

    // Filter
    const filtered = reports.filter((r) => {
        if (filter === 'all') return true
        if (filter === 'violations') return !r.isCompliant
        if (filter === 'routine') return Number(r.trigger) === 0
        if (filter === 'regulator') return Number(r.trigger) === 3
        return true
    })

    // Pagination
    const total = filtered.length
    const maxPage = Math.max(0, Math.ceil(total / ITEMS_PER_PAGE) - 1)
    const safePage = Math.min(page, maxPage)
    const currentItems = filtered.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE)

    function handleFilter(type: FilterType) {
        setFilter(type)
        setPage(0) // reset page
    }

    function FilterTab({ type, label }: { type: FilterType; label: string }) {
        const active = filter === type
        return (
            <button
                onClick={() => handleFilter(type)}
                style={{
                    background: active ? '#1A1A1A' : 'white',
                    color: active ? 'white' : '#1A1A1A',
                    border: '2px solid #1A1A1A',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                    if (!active) (e.target as HTMLButtonElement).style.background = '#F5F5F0'
                }}
                onMouseLeave={(e) => {
                    if (!active) (e.target as HTMLButtonElement).style.background = 'white'
                }}
            >
                {label}
            </button>
        )
    }

    return (
        <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <FilterTab type="all" label="All Proofs" />
                <FilterTab type="routine" label="Routine" />
                <FilterTab type="violations" label="Violations" />
                <FilterTab type="regulator" label="Regulator" />
            </div>

            <div
                style={{
                    border: '2px solid #1A1A1A',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#FFFBF0',
                }}
            >
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        {/* Thead */}
                        <thead style={{ background: '#1A1A1A', color: 'white' }}>
                            <tr>
                                <th className="px-5 py-4 font-black mono text-xs tracking-widest text-[rgba(255,255,255,0.5)]">#ID</th>
                                <th className="px-5 py-4 font-black mono text-xs tracking-widest text-[rgba(255,255,255,0.5)]">BLOCK</th>
                                <th className="px-5 py-4 font-black mono text-xs tracking-widest text-[rgba(255,255,255,0.5)]">RATIO</th>
                                <th className="px-5 py-4 font-black mono text-xs tracking-widest text-[rgba(255,255,255,0.5)]">STATUS</th>
                                <th className="px-5 py-4 font-black mono text-xs tracking-widest text-[rgba(255,255,255,0.5)]">TRIGGER</th>
                                <th className="px-5 py-4 font-black mono text-xs tracking-widest text-[rgba(255,255,255,0.5)]">AGENT REASONING</th>
                                <th className="px-5 py-4 font-black mono text-xs tracking-widest text-[rgba(255,255,255,0.5)]">TX HASH</th>
                            </tr>
                        </thead>

                        {/* Tbody */}
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B6B6B' }}>
                                        Fetching chain data...
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B6B6B' }}>
                                        No proofs found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((r, i) => (
                                    <tr
                                        key={Number(r.reportId)}
                                        style={{
                                            borderBottom: '1px solid #F0F0F0',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '#F5F5F0')}
                                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                                    >
                                        {/* ID */}
                                        <td style={{ padding: '12px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 13, fontWeight: 600 }}>
                                            #{Number(r.reportId)}
                                        </td>

                                        {/* Block */}
                                        <td style={{ padding: '12px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 13, color: '#6B6B6B' }}>
                                            <a
                                                href={getExplorerBlockUrl(Number(r.blockNumber))}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: 'inherit', textDecoration: 'none' }}
                                                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.textDecoration = 'underline')}
                                                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.textDecoration = 'none')}
                                            >
                                                {formatBlock(r.blockNumber)} ↗
                                            </a>
                                        </td>

                                        {/* Ratio */}
                                        <td
                                            style={{
                                                padding: '12px 20px',
                                                fontWeight: 700,
                                                color: r.isCompliant ? '#00C896' : '#FF3B30',
                                            }}
                                        >
                                            {formatBps(r.ratioBps)}
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '12px 20px' }}>
                                            <Badge variant={r.isCompliant ? 'green' : 'red'}>
                                                {r.isCompliant ? 'Compliant' : 'Violation'}
                                            </Badge>
                                        </td>

                                        {/* Trigger */}
                                        <td style={{ padding: '12px 20px' }}>
                                            <Badge variant={triggerBadgeVariant(Number(r.trigger))}>
                                                {triggerLabel(Number(r.trigger))}
                                            </Badge>
                                        </td>

                                        {/* Reasoning */}
                                        <td style={{ padding: '12px 20px', maxWidth: 280 }}>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontStyle: 'italic',
                                                    color: '#6B6B6B',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <span style={{ display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    &quot;{r.agentReasoning}&quot;
                                                </span>
                                                <button
                                                    onClick={() => setExpandedReasoning(r.agentReasoning)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#1D4ED8',
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline',
                                                    }}
                                                >
                                                    Expand ↓
                                                </button>
                                            </div>
                                        </td>

                                        {/* TX */}
                                        <td style={{ padding: '12px 20px' }}>
                                            <a
                                                href={getExplorerTxUrl(r.proofHash)}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    fontFamily: 'var(--font-dm-mono)',
                                                    fontSize: 12,
                                                    color: '#1D4ED8',
                                                    fontWeight: 500,
                                                    textDecoration: 'none',
                                                }}
                                                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.textDecoration = 'underline')}
                                                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.textDecoration = 'none')}
                                            >
                                                {truncateHash(r.proofHash, 6)} ↗
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div
                    style={{
                        background: '#FFFBF0',
                        borderTop: '2px solid #1A1A1A',
                        padding: '16px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ fontSize: 13, color: '#6B6B6B', fontWeight: 500 }}>
                        Showing {total === 0 ? 0 : safePage * ITEMS_PER_PAGE + 1}-
                        {Math.min((safePage + 1) * ITEMS_PER_PAGE, total)} of {total} proofs
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage >= maxPage}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next →
                        </Button>
                    </div>
                </div>
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
                            padding: 32,
                            maxWidth: 520,
                            width: '100%',
                            position: 'relative',
                            boxShadow: '4px 4px 0 #1A1A1A',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedReasoning(null)}
                            style={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6B6B6B',
                            }}
                        >
                            <X size={20} />
                        </button>
                        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, paddingRight: 24 }}>
                            Agent Reasoning
                        </div>
                        <div
                            style={{
                                fontSize: 15,
                                lineHeight: 1.7,
                                color: '#1A1A1A',
                                marginBottom: 20,
                            }}
                        >
                            {expandedReasoning}
                        </div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                color: '#6B6B6B',
                                borderTop: '1px solid #F0F0F0',
                                paddingTop: 16,
                            }}
                        >
                            Stored on-chain on Base Sepolia forever.
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
