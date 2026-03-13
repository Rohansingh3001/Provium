// components/landing/FinalCTA.tsx
'use client'
import { Button } from '@/components/ui/Button'
import { BASE_SEPOLIA_EXPLORER } from '@/lib/wagmi'

export function FinalCTA() {
    return (
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '96px 40px', textAlign: 'center' }}>
            {/* Yellow badge */}
            <div
                style={{
                    display: 'inline-block',
                    background: '#FFE500',
                    border: '2px solid #1A1A1A',
                    boxShadow: '3px 3px 0 #1A1A1A',
                    borderRadius: 4,
                    padding: '5px 16px',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: 24,
                }}
            >
                Live on Base Testnet
            </div>
            <h2
                style={{
                    fontSize: 'clamp(52px, 6vw, 76px)',
                    fontWeight: 900,
                    letterSpacing: '-3px',
                    lineHeight: 0.93,
                    marginBottom: 24,
                }}
            >
                The math never{' '}
                <span
                    style={{
                        color: '#FF90E8',
                        textShadow: '3px 3px 0 #1A1A1A',
                    }}
                >
                    lies.
                </span>
            </h2>

            <p
                style={{
                    fontSize: 18,
                    color: '#6B6B6B',
                    lineHeight: 1.6,
                    marginBottom: 40,
                }}
            >
                Provium is live on Base Testnet. Every proof is real. Every agent decision
                is real. Every Basescan link works.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Button variant="black" size="lg" href="/dashboard">
                    Open Dashboard →
                </Button>
                <Button variant="yellow" size="lg" href="/dashboard/regulator">
                    Submit Request
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    href={BASE_SEPOLIA_EXPLORER}
                    target="_blank"
                    rel="noreferrer"
                >
                    Basescan ↗
                </Button>
            </div>

            <div
                style={{
                    marginTop: 80,
                    paddingTop: 40,
                    borderTop: '3px solid #1A1A1A',
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#6B6B6B',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                }}
            >
                Built at ETHGlobal Mumbai · Noir ZK · Groq + Agno · Base Testnet
            </div>
        </section>
    )
}
