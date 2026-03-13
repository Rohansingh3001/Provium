// components/landing/RegulatorPreview.tsx
'use client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const features = [
    'Cryptographic proof — zero raw user data',
    'LLM reasoning stored on-chain, readable by anyone',
    'Verified by UltraVerifier smart contract',
    'Any jurisdiction — US GENIUS Act, EU MiCA, FATF',
]

function FieldRow({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    color: '#6B6B6B',
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>
                {children}
            </div>
        </div>
    )
}

export function RegulatorPreview() {
    return (
        <section
            id="regulator"
            style={{ padding: '80px 0', background: '#FFFBF0' }}
        >
            <div
                style={{
                    maxWidth: 1280,
                    margin: '0 auto',
                    padding: '0 40px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 64,
                    alignItems: 'center',
                }}
                className="regulator-grid"
            >
                {/* Left */}
                <div>
                    <div className="section-label" style={{ marginBottom: 16 }}>
                        Regulator Portal
                    </div>
                    <h2 className="section-title" style={{ marginBottom: 20 }}>
                        Submit once.<br />Get proof in 60 seconds.
                    </h2>
                    <p
                        style={{
                            fontSize: 16,
                            lineHeight: 1.7,
                            color: '#6B6B6B',
                            marginBottom: 32,
                        }}
                    >
                        Any regulator submits an on-chain compliance request. The agent
                        detects it automatically and fulfills it within one epoch — complete
                        with a real ZK proof and LLM-generated reasoning stored permanently
                        on-chain.
                    </p>

                    {/* Feature list */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            marginBottom: 36,
                        }}
                    >
                        {features.map((f) => (
                            <div
                                key={f}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    fontSize: 15,
                                    fontWeight: 500,
                                    color: '#1A1A1A',
                                }}
                            >
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 22,
                                        height: 22,
                                        background: '#00C896',
                                        border: '2px solid #1A1A1A',
                                        borderRadius: 4,
                                        color: '#1A1A1A',
                                        fontWeight: 900,
                                        fontSize: 12,
                                        flexShrink: 0,
                                    }}
                                >
                                    ✓
                                </span>
                                {f}
                            </div>
                        ))}
                    </div>

                    <Button variant="black" size="lg" href="/dashboard/regulator">
                        Open Regulator Portal →
                    </Button>
                </div>

                {/* Right — Fulfilled Request Card */}
                <div
                    className="card"
                >
                    {/* Card header */}
                    <div
                        style={{
                            background: '#FFE500',
                            borderBottom: '3px solid #1A1A1A',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span style={{ fontWeight: 800, fontSize: 15 }}>
                            Request #14 — Collateral Ratio
                        </span>
                        <Badge variant="green">✓ Fulfilled</Badge>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: 24 }}>
                        <FieldRow label="REQUESTOR">
                            <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 14 }}>
                                🏛 compliance.eth
                            </span>
                        </FieldRow>
                        <FieldRow label="JURISDICTION">
                            <Badge variant="pink">US-GENIUS-ACT</Badge>
                        </FieldRow>
                        <FieldRow label="TARGET BLOCK">
                            <span style={{ fontFamily: 'var(--font-dm-mono)' }}>#18,294,847</span>
                        </FieldRow>
                        <FieldRow label="PROOF HASH">
                            <span
                                style={{
                                    fontFamily: 'var(--font-dm-mono)',
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                0x9f3a...c281
                                <a
                                    href="https://sepolia.basescan.org"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#FF90E8', textDecoration: 'underline', fontWeight: 700 }}
                                >
                                    ↗ Basescan
                                </a>
                            </span>
                        </FieldRow>
                        <FieldRow label="FULFILLED IN">
                            <span style={{ color: '#00C896', fontWeight: 800 }}>47 seconds</span>
                        </FieldRow>

                        {/* Reasoning box */}
                        <div
                            style={{
                                marginTop: 16,
                                background: '#FFFBF0',
                                border: '2px solid #1A1A1A',
                                boxShadow: '3px 3px 0 #1A1A1A',
                                borderRadius: 6,
                                padding: 16,
                            }}
                        >
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
                                🤖 AGENT REASONING (on-chain forever)
                            </div>
                            <p
                                style={{
                                    fontSize: 13,
                                    fontStyle: 'italic',
                                    color: '#6B6B6B',
                                    lineHeight: 1.6,
                                    margin: 0,
                                }}
                            >
                                &quot;Routine collateral ratio proof for US-GENIUS-ACT jurisdiction.
                                All 5 positions verified above 150% minimum threshold. Lowest
                                position at 163% collateral ratio. Aggregate: 342 ETH
                                collateral, 200,000 USDC debt. Protocol ratio: 171%. No
                                violations detected at block #18,294,847.&quot;
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media (max-width: 900px) {
          .regulator-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
        </section>
    )
}
