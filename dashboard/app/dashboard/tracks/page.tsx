// app/dashboard/tracks/page.tsx
'use client'
import { Shield, FileText, Key, Wallet, ExternalLink, CheckCircle, Clock } from 'lucide-react'

const CONTRACTS = {
    ComplianceRegistry: '0xFbE3F85Ab541Cd538542B543E87706D00e1f7013',
    RegulatorPortal: '0x857597Ff99083c83C1c33165A61915236F20A888',
    LendingProtocol: '0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f',
    UltraVerifier: '0x93362E57c5dBA158420c8db8CB4484b12f96bB84',
}

const EXPLORER = 'https://sepolia.basescan.org'

function TrackCard({
    icon: Icon,
    color,
    title,
    subtitle,
    features,
    files,
}: {
    icon: any
    color: string
    title: string
    subtitle: string
    features: { label: string; done: boolean }[]
    files: string[]
}) {
    return (
        <div
            style={{
                background: 'white',
                border: '3px solid #1A1A1A',
                borderRadius: 8,
                boxShadow: '6px 6px 0 #1A1A1A',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    background: color,
                    padding: '20px 24px',
                    borderBottom: '3px solid #1A1A1A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                }}
            >
                <div
                    style={{
                        width: 44,
                        height: 44,
                        background: '#1A1A1A',
                        borderRadius: 8,
                        border: '2px solid #1A1A1A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Icon size={22} color={color} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>{title}</h3>
                    <p style={{ fontSize: 13, color: '#1A1A1A', margin: 0, opacity: 0.7 }}>{subtitle}</p>
                </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        color: '#999',
                        marginBottom: 12,
                    }}
                >
                    Integration Features
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {features.map((f) => (
                        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {f.done ? (
                                <CheckCircle size={16} color="#00C896" strokeWidth={2.5} />
                            ) : (
                                <Clock size={16} color="#F59E0B" strokeWidth={2.5} />
                            )}
                            <span style={{ fontSize: 13, color: '#3A3A3A' }}>{f.label}</span>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        color: '#999',
                        marginBottom: 8,
                    }}
                >
                    Key Files
                </div>
                <div
                    style={{
                        background: '#F8F8F5',
                        border: '1px solid #E8E8E0',
                        borderRadius: 4,
                        padding: '10px 14px',
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 12,
                        lineHeight: 2,
                        color: '#5A5A5A',
                    }}
                >
                    {files.map((f) => (
                        <div key={f}>{f}</div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function TracksPage() {
    return (
        <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Header */}
            <div>
                <div className="dash-section-label" style={{ marginBottom: 10 }}>
                    Bounty Integrations
                </div>
                <h1
                    style={{
                        fontSize: 32,
                        fontWeight: 900,
                        color: '#1A1A1A',
                        margin: '0 0 12px',
                        letterSpacing: '-1px',
                    }}
                >
                    Hackathon Track Integrations
                </h1>
                <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.6, margin: 0, maxWidth: 600 }}>
                    Provium integrates three bounty-track technologies to build enterprise-grade compliance
                    infrastructure. Each integration is env-gated and falls back gracefully.
                </p>
            </div>

            {/* Deployed Contracts */}
            <div
                style={{
                    background: '#1A1A1A',
                    border: '3px solid #1A1A1A',
                    borderRadius: 8,
                    boxShadow: '6px 6px 0 #FFE500',
                    padding: '20px 24px',
                }}
            >
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        color: '#FFE500',
                        marginBottom: 16,
                    }}
                >
                    Deployed Contracts — Base Sepolia (84532)
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
                    }}
                    className="contracts-grid"
                >
                    {Object.entries(CONTRACTS).map(([name, addr]) => (
                        <a
                            key={name}
                            href={`${EXPLORER}/address/${addr}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 6,
                                padding: '10px 14px',
                                textDecoration: 'none',
                                transition: 'background 0.15s',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#FFE500' }}>{name}</div>
                                <div
                                    style={{
                                        fontFamily: 'var(--font-dm-mono)',
                                        fontSize: 11,
                                        color: 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    {addr.slice(0, 6)}...{addr.slice(-4)}
                                </div>
                            </div>
                            <ExternalLink size={14} color="rgba(255,255,255,0.3)" />
                        </a>
                    ))}
                </div>
            </div>

            {/* Track Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <TrackCard
                    icon={Wallet}
                    color="#4A90D9"
                    title="BitGo — Multi-sig Custody"
                    subtitle="Enterprise wallet infrastructure for ZK proof submissions"
                    features={[
                        { label: 'BitGo REST API v2 client (Python)', done: true },
                        { label: 'Multi-sig tx signing for submitReport()', done: true },
                        { label: 'Automatic fallback to eth_account when not configured', done: true },
                        { label: 'Policy enforcement (velocity limits, whitelist)', done: true },
                        { label: 'Wallet balance & transfer history queries', done: true },
                        { label: 'Env-gated activation (BITGO_ACCESS_TOKEN)', done: true },
                    ]}
                    files={[
                        'agent/tools/bitgo_tools.py   — BitGo REST API v2 client',
                        'agent/tools/submit_tools.py  — BitGo-first tx signing',
                    ]}
                />

                <TrackCard
                    icon={FileText}
                    color="#FF90E8"
                    title="Fileverse — Decentralized Evidence"
                    subtitle="IPFS/Filecoin-backed compliance dossier storage"
                    features={[
                        { label: 'Compliance dossier builder (schema v1)', done: true },
                        { label: 'SHA-256 content hash integrity verification', done: true },
                        { label: 'Fileverse API upload (REST)', done: true },
                        { label: 'Local fallback to agent/dossiers/', done: true },
                        { label: 'Dashboard "View Dossier" column in Proof History', done: true },
                        { label: 'Non-blocking: never stops the core agent loop', done: true },
                    ]}
                    files={[
                        'agent/tools/fileverse_tools.py — Dossier builder + uploader',
                        'agent/orchestrator.py          — Fileverse hook after proof',
                        'dashboard/.../ProofTable.tsx    — Dossier link column',
                    ]}
                />

                <TrackCard
                    icon={Key}
                    color="#00C896"
                    title="ENSIP-25 — AI Agent Registry"
                    subtitle="ENS-based identity verification for autonomous agents"
                    features={[
                        { label: 'ERC-7930 interoperable address encoding', done: true },
                        { label: 'ENSIP-25 text record key builder', done: true },
                        { label: 'Verification function (non-empty value check)', done: true },
                        { label: 'Dashboard ENSIP-25 badge with live verification', done: true },
                        { label: 'CLI tool for ENS setup instructions', done: true },
                        { label: 'Agent startup logging with text record key', done: true },
                    ]}
                    files={[
                        'agent/tools/ensip25.py                  — Core ENSIP-25 logic',
                        'dashboard/components/Ensip25Badge.tsx    — Verification badge',
                        'dashboard/lib/hooks/useEnsip25Verify...  — React hook',
                    ]}
                />
            </div>

            {/* ZK Circuit info */}
            <div
                style={{
                    background: '#FFFBF0',
                    border: '3px solid #1A1A1A',
                    borderRadius: 8,
                    boxShadow: '4px 4px 0 #1A1A1A',
                    padding: '24px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 16,
                    }}
                >
                    <Shield size={20} strokeWidth={2.5} />
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                        ZK Circuit — Noir / UltraHonk / BN254
                    </h3>
                </div>
                <div style={{ fontSize: 14, color: '#3A3A3A', lineHeight: 1.8 }}>
                    The Noir circuit proves four properties in zero knowledge:
                </div>
                <ol style={{ fontSize: 13, color: '#5A5A5A', lineHeight: 1.8, paddingLeft: 20, marginTop: 8 }}>
                    <li>
                        <strong>Per-position ratio check</strong> — each of 16 positions individually meets the protocol&apos;s 150% minimum
                    </li>
                    <li>
                        <strong>Merkle proof</strong> — each position ties to the public Poseidon2 Merkle root
                    </li>
                    <li>
                        <strong>Aggregate sum</strong> — sum of private values equals claimed public totals
                    </li>
                    <li>
                        <strong>Aggregate ratio</strong> — total collateral/debt ratio passes threshold
                    </li>
                </ol>
                <div
                    style={{
                        marginTop: 12,
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 12,
                        color: '#999',
                    }}
                >
                    circuits/collateral_proof/src/main.nr — 58 lines of Noir
                </div>
            </div>

            {/* Responsive CSS */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                @media (max-width: 720px) {
                    .contracts-grid { grid-template-columns: 1fr !important; }
                }
            `,
                }}
            />
        </div>
    )
}
