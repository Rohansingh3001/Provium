// app/dashboard/proofs/page.tsx
'use client'
import { useEffect } from 'react'
import { useProofHistory } from '@/lib/hooks/useProofHistory'
import { ProofTable } from '@/components/dashboard/ProofTable'
import { useNotificationStore } from '@/lib/store'

export default function ProofsPage() {
    const { reports } = useProofHistory()
    const markSeen = useNotificationStore((s) => s.markSeen)

    // Clear notification badge when user lands on this page
    useEffect(() => {
        markSeen()
    }, [markSeen])

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <div>
                    <div className="dash-section-label" style={{ marginBottom: 8 }}>Proof history</div>
                    <span
                        style={{
                            display: 'inline-block',
                            background: '#1A1A1A',
                            border: '2px solid #1A1A1A',
                            boxShadow: '3px 3px 0 #FF90E8',
                            color: '#FFFFFF',
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                        }}
                    >
                        {reports.length} proofs on-chain
                    </span>
                </div>
            </div>

            <ProofTable />
        </div>
    )
}
