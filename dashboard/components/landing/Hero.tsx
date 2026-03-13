// components/landing/Hero.tsx
'use client'
import { Button } from '@/components/ui/Button'
import { LiveTicker } from './LiveTicker'

// ── Hero Dashboard Card (right column) ──────────────────────────────────────
function HeroDashboardCard() {
    const logLines = [
        { time: '14:23:41', agent: 'WATCHER', agentColor: '#60A5FA', msg: 'Epoch check. Fetching 5 positions...' },
        { time: '14:23:44', agent: 'ANALYST', agentColor: '#A78BFA', msg: 'Decision: collateral proof. Routine.' },
        { time: '14:23:46', agent: 'REPORTER', agentColor: '#FF90E8', msg: 'Generating Noir proof via Barretenberg...' },
        { time: '14:23:53', agent: '✓ PROOF', agentColor: '#34D399', msg: 'Generated 7.2s · isCompliant: true' },
        { time: '14:23:55', agent: '⛓ TX', agentColor: '#60A5FA', msg: '0x4f2a...8c3b ↗', isTx: true },
    ]

    return (
        <div
            style={{
                border: '3px solid #1A1A1A',
                borderRadius: 8,
                boxShadow: '8px 8px 0 #1A1A1A',
                overflow: 'hidden',
                background: '#FFFBF0',
                transform: 'rotate(1deg) scale(1.02)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.02) translateY(-4px)'; e.currentTarget.style.boxShadow = '12px 12px 0 #1A1A1A' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(1deg) scale(1.02)'; e.currentTarget.style.boxShadow = '8px 8px 0 #1A1A1A' }}
        >
            {/* macOS header */}
            <div
                style={{
                    background: '#1A1A1A',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA41' }} />
                </div>
                <span
                    style={{
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.45)',
                        marginLeft: 4,
                    }}
                >
                    zkcomply-agent.eth · Base Testnet
                </span>
                <div
                    style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <div
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#23A094',
                            animation: 'pulseDot 2s infinite',
                        }}
                    />
                    <span
                        style={{
                            fontFamily: 'var(--font-dm-mono)',
                            fontSize: 11,
                            color: '#23A094',
                        }}
                    >
                        LIVE
                    </span>
                </div>
            </div>

            <div
                style={{
                    padding: '18px 20px',
                    borderBottom: '3px solid #1A1A1A',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    background: '#FFE500',
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: 'rgba(26,26,26,0.6)',
                            marginBottom: 4,
                        }}
                    >
                        COMPLIANCE STATUS
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A' }}>
                        ● COMPLIANT
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
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
                        COLLATERAL RATIO
                    </div>
                    <div
                        style={{
                            fontSize: 36,
                            fontWeight: 900,
                            color: '#FF90E8',
                            letterSpacing: '-2px',
                            lineHeight: 1,
                        }}
                    >
                        171%
                    </div>
                </div>
            </div>

            {/* Log lines */}
            <div style={{ padding: '16px 20px' }}>
                {logLines.map((line, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                            borderBottom: i < logLines.length - 1 ? '1px solid #F0F0F0' : 'none',
                            padding: '7px 0',
                        }}
                    >
                        <span
                            style={{
                                fontFamily: 'var(--font-dm-mono)',
                                fontSize: 11,
                                color: 'rgba(26,26,26,0.3)',
                                flexShrink: 0,
                                lineHeight: '18px',
                            }}
                        >
                            {line.time}
                        </span>
                        <span
                            style={{
                                fontFamily: 'var(--font-dm-mono)',
                                fontSize: 11,
                                fontWeight: 600,
                                color: line.agentColor,
                                flexShrink: 0,
                                lineHeight: '18px',
                                minWidth: 66,
                            }}
                        >
                            [{line.agent}]
                        </span>
                        <span
                            style={{
                                fontFamily: 'var(--font-dm-mono)',
                                fontSize: 11,
                                color: line.isTx ? '#1D4ED8' : '#4B5563',
                                textDecoration: line.isTx ? 'underline' : 'none',
                                lineHeight: '18px',
                            }}
                        >
                            {i === logLines.length - 1 ? (
                                <>
                                    {line.msg}
                                    <span style={{ marginLeft: 'auto', float: 'right', color: '#6B6B6B', fontSize: 10 }}>
                                        Report #47
                                    </span>
                                </>
                            ) : (
                                line.msg
                            )}
                        </span>
                    </div>
                ))}
                <div
                    style={{
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 11,
                        color: 'rgba(26,26,26,0.2)',
                        paddingTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    Next epoch in 60s...
                    <span className="cursor-blink" style={{ width: 6, height: 12, background: 'rgba(26,26,26,0.25)' }} />
                </div>
            </div>
        </div>
    )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export function Hero() {
    return (
        <section className="relative overflow-hidden">
            {/* Ambient background — subtle cream tint only */}
            <div className="absolute inset-0 bg-[#FFFBF0] -z-20" />
            <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-[120px] bg-[#FF90E8]/10 -z-10 animate-pulse" style={{ animationDuration: '8s' }} />

            <div
                style={{
                    maxWidth: 1300,
                    margin: '0 auto',
                    padding: '100px 40px 80px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(400px, 500px)',
                    gap: 80,
                    alignItems: 'center',
                    minHeight: 'calc(100vh - 64px)',
                }}
                className="responsive-hero-grid"
            >
                {/* Left */}
                <div>
                    <div
                        className="section-label animate-fade-up"
                        style={{ marginBottom: 20, animationDelay: '0s' }}
                    >
                        ZK Compliance Agent · Built on Base
                    </div>

                    <h1
                        className="hero-headline animate-fade-up"
                        style={{ marginBottom: 24, color: '#1A1A1A', animationDelay: '0.1s' }}
                    >
                        Comply
                        <br />
                        without
                        <br />
                        <span style={{ color: '#FF90E8', textShadow: '3px 3px 0 #1A1A1A' }}>exposure.</span>
                    </h1>

                    <p
                        className="animate-fade-up"
                        style={{
                            fontSize: 18,
                            lineHeight: 1.7,
                            color: '#6B6B6B',
                            maxWidth: 540,
                            marginBottom: 36,
                            animationDelay: '0.2s',
                        }}
                    >
                        An autonomous AI agent team that proves your DeFi protocol meets GENIUS Act
                        requirements — every 60 seconds, on-chain, without revealing a single user's
                        position.
                    </p>

                    <div
                        className="flex flex-col sm:flex-row gap-3 flex-wrap mb-7 animate-fade-up"
                        style={{ animationDelay: '0.3s' }}
                    >
                        <Button variant="black" size="lg" href="/dashboard" className="w-full sm:w-auto !justify-center">
                            Open Dashboard →
                        </Button>
                        <Button variant="outline" size="lg" href="/dashboard/regulator" className="w-full sm:w-auto !justify-center">
                            Submit Request
                        </Button>
                    </div>

                    <div className="animate-fade-up" style={{ animationDelay: '0.4s', width: '100%', minWidth: 0 }}>
                        <LiveTicker />
                    </div>
                </div>

                {/* Right */}
                <div className="hero-card-col animate-fade-up" style={{ animationDelay: '0.5s' }}>
                    <HeroDashboardCard />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media (max-width: 1024px) {
          .responsive-hero-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .hero-card-col {
            display: none;
          }
        }
      `}} />
        </section>
    )
}
