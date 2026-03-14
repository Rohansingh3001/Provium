'use client'

import { Card } from '@/components/ui/Card'
import { EnsAddress } from '@/components/EnsAddress'
import { Ensip25Badge } from '@/components/Ensip25Badge'
import { useEnsAddress, useEnsText } from 'wagmi'
import { mainnet } from 'wagmi/chains'

function EnsTextRow({
    name,
    label,
    recordKey,
}: {
    name?: string
    label: string
    recordKey: string
}) {
    const { data, isLoading } = useEnsText({
        name,
        key: recordKey,
        chainId: mainnet.id,
    })

    if (!name) {
        return (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: '1px dashed #D9D2BE',
                    alignItems: 'start',
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: '#6B6B6B',
                    }}
                >
                    {label}
                </div>
                <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.55 }}>Set ENS name first</div>
            </div>
        )
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: 12,
                padding: '10px 0',
                borderTop: '1px dashed #D9D2BE',
                alignItems: 'start',
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: '#6B6B6B',
                }}
            >
                {label}
            </div>
            <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.55, wordBreak: 'break-word' }}>
                {isLoading ? 'Loading…' : data || 'Not set'}
            </div>
        </div>
    )
}

export function EnsProfileCard() {
    const protocolName  = process.env.NEXT_PUBLIC_ENS_PROTOCOL_NAME || ''
    const agentName     = process.env.NEXT_PUBLIC_ENS_AGENT_NAME    || ''
    // ComplianceRegistry address for ENSIP-25 ERC-7930 encoding
    const registryAddr  = process.env.NEXT_PUBLIC_COMPLIANCE_REGISTRY || ''
    const ensip25AgentId = process.env.NEXT_PUBLIC_ENSIP25_AGENT_ID  || '1'

    const { data: protocolAddress } = useEnsAddress({
        name: protocolName || undefined,
        chainId: mainnet.id,
    })

    const { data: agentAddress } = useEnsAddress({
        name: agentName || undefined,
        chainId: mainnet.id,
    })

    return (
        <Card>
            <div style={{ padding: '24px 28px', borderBottom: '3px solid #1A1A1A', background: '#FFF7CC' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#1A1A1A', marginBottom: 8 }}>
                    ENS Track
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#1A1A1A', marginBottom: 8, letterSpacing: '-0.8px' }}>
                    DeFi identity via ENS text records
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#4A4A4A', maxWidth: 760 }}>
                    Provium can attach protocol metadata, privacy policy pointers, interface URLs, and operator labels to ENS names.
                    That turns ENS into a readable control plane for DeFi compliance, not just an address book.
                </p>
            </div>

            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }} className="ens-track-grid">
                <div>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6B6B6B', marginBottom: 12 }}>
                        Protocol profile
                    </div>

                    <div style={{
                        border: '2px solid #1A1A1A',
                        borderRadius: 6,
                        background: 'white',
                        padding: '16px 18px',
                        boxShadow: '4px 4px 0 #1A1A1A',
                    }}>
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B6B6B', marginBottom: 4 }}>ENS name</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{protocolName || 'Set NEXT_PUBLIC_ENS_PROTOCOL_NAME'}</div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B6B6B', marginBottom: 4 }}>Resolved address</div>
                            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 13, color: '#1A1A1A' }}>
                                <EnsAddress address={protocolAddress ?? undefined} truncate={6} />
                            </div>
                        </div>

                        <EnsTextRow name={protocolName} label="Interface" recordKey="provium.interface" />
                        <EnsTextRow name={protocolName} label="Privacy mode" recordKey="provium.privacy" />
                        <EnsTextRow name={protocolName} label="Swap pref" recordKey="provium.swapPreference" />
                        <EnsTextRow name={protocolName} label="Compliance policy" recordKey="provium.compliancePolicy" />
                    </div>
                </div>

                <div>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6B6B6B', marginBottom: 12 }}>
                        Agent identity
                    </div>

                    <div style={{
                        border: '2px solid #1A1A1A',
                        borderRadius: 6,
                        background: '#FFFBF0',
                        padding: '16px 18px',
                        boxShadow: '4px 4px 0 #FFE500',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B6B6B', marginBottom: 4 }}>ENS name</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{agentName || 'Set NEXT_PUBLIC_ENS_AGENT_NAME'}</div>
                        </div>

                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B6B6B', marginBottom: 4 }}>Resolved address</div>
                            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 13, color: '#1A1A1A' }}>
                                <EnsAddress address={agentAddress ?? undefined} truncate={6} />
                            </div>
                        </div>

                        <EnsTextRow name={agentName} label="Role" recordKey="provium.role" />
                        <EnsTextRow name={agentName} label="Proof mode" recordKey="provium.proofMode" />
                        <EnsTextRow name={agentName} label="BitGo rail" recordKey="provium.bitgoRail" />

                        {/* ── ENSIP-25 Agent Verification ── */}
                        <div style={{ paddingTop: 14, borderTop: '1px dashed #D9D2BE', marginTop: 4 }}>
                            <div style={{
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase',
                                color: '#6B6B6B',
                                marginBottom: 10,
                            }}>
                                ENSIP-25 Verification
                            </div>
                            <Ensip25Badge
                                ensName={agentName || undefined}
                                registryAddress={registryAddr}
                                agentId={ensip25AgentId}
                                registryChainId={84532}
                                showKey
                            />
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                    @media (max-width: 980px) {
                        .ens-track-grid { grid-template-columns: 1fr !important; }
                    }
                `,
            }} />
        </Card>
    )
}
