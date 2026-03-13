// components/landing/AgentShowcase.tsx
'use client'
import { Button } from '@/components/ui/Button'
import { BASE_SEPOLIA_EXPLORER } from '@/lib/wagmi'

const agents = [
    {
        letter: 'W',
        bg: '#1E40AF',
        name: 'Watcher',
        model: 'Groq · llama-3.3-70b-versatile',
        desc: 'Monitors chain. Searches web for OFAC updates via DuckDuckGo.',
    },
    {
        letter: 'A',
        bg: '#7C3AED',
        name: 'Analyst',
        model: 'Groq · llama3-groq-70b-8192-tool-use',
        desc: 'Decides proof type. Writes on-chain reasoning.',
    },
    {
        letter: 'R',
        bg: '#BE185D',
        name: 'Reporter',
        model: 'Groq · llama3-groq-70b-8192-tool-use',
        desc: 'Runs Barretenberg prover. Submits proofs on-chain.',
    },
]

const terminalLines = [
    { time: '14:23:41', agent: 'WATCHER', color: '#60A5FA', msg: 'Fetching 5 positions from Base Sepolia...' },
    { time: '14:23:42', agent: 'WATCHER', color: '#60A5FA', msg: '🔍 Searching: "OFAC SDN list update today"' },
    { time: '14:23:43', agent: 'WATCHER', color: '#60A5FA', msg: 'No new entries. Lowest ratio: 163%. Handing off.' },
    { time: '14:23:44', agent: 'ANALYST', color: '#A78BFA', msg: 'Decision: routine collateral proof (8h elapsed)' },
    { time: '14:23:45', agent: 'ANALYST', color: '#A78BFA', msg: 'Reasoning: All 5 positions above 150%...' },
    { time: '14:23:46', agent: 'REPORTER', color: '#FF90E8', msg: 'Building Merkle tree. Committing root...' },
    { time: '14:23:48', agent: 'REPORTER', color: '#FF90E8', msg: 'Running nargo prove via Barretenberg...' },
    { time: '14:23:53', agent: '✓ PROOF', color: '#34D399', msg: 'Valid · isCompliant: true · Report #47' },
    { time: '14:23:55', agent: '⛓ TX', color: '#60A5FA', msg: '0x4f2a...8c3b ↗ Basescan', isLink: true },
    { time: '14:23:56', agent: '', color: 'rgba(255,255,255,0.2)', msg: 'Next epoch in 60s...' },
]

export function AgentShowcase() {
    return (
        <section
            id="agent"
            style={{
                background: '#1A1A1A',
                color: 'white',
                padding: '80px 40px',
            }}
        >
            <div
                style={{
                    maxWidth: 1280,
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 64,
                    alignItems: 'start',
                }}
                className="agent-grid"
            >
                {/* Left */}
                <div>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: '#FF90E8',
                            marginBottom: 16,
                        }}
                    >
                        Three Groq Agents · Agno Framework
                    </div>
                    <h2
                        className="section-title"
                        style={{ color: 'white', marginBottom: 20 }}
                    >
                        The agent never<br />sleeps.
                    </h2>
                    <p
                        style={{
                            fontSize: 16,
                            lineHeight: 1.7,
                            color: 'rgba(255,255,255,0.55)',
                            marginBottom: 32,
                        }}
                    >
                        Three specialized AI agents coordinate in an intelligent orchestration pipeline. The Watcher
                        searches the web for live OFAC updates. The Analyst reasons about chain state and decides what
                        proof is needed. The Reporter generates real Noir ZK proofs on-chain. Every 60 seconds — bounded
                        by design, because this is a financial compliance system.
                    </p>

                    {/* Agent cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                        {agents.map((agent) => (
                            <div
                                key={agent.name}
                                style={{
                                    border: '2px solid #444',
                                    borderRadius: 6,
                                    padding: '14px 16px',
                                    display: 'flex',
                                    gap: 14,
                                    alignItems: 'flex-start',
                                    transition: 'border-color 0.15s, background 0.15s',
                                    cursor: 'default',
                                }}
                                onMouseEnter={(e) => {
                                    const el = e.currentTarget as HTMLDivElement
                                    el.style.borderColor = '#FFE500'
                                    el.style.background = 'rgba(255,229,0,0.06)'
                                }}
                                onMouseLeave={(e) => {
                                    const el = e.currentTarget as HTMLDivElement
                                    el.style.borderColor = '#444'
                                    el.style.background = 'transparent'
                                }}
                            >
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 4,
                                        background: agent.bg,
                                        border: '2px solid rgba(255,255,255,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 900,
                                        fontSize: 15,
                                        flexShrink: 0,
                                    }}
                                >
                                    {agent.letter}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, color: 'white', fontSize: 15, marginBottom: 2 }}>
                                        {agent.name}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-dm-mono)',
                                            fontSize: 11,
                                            color: '#FFE500',
                                            marginBottom: 6,
                                            opacity: 0.7,
                                        }}
                                    >
                                        {agent.model}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                                        {agent.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <Button variant="pink" size="md" href="/dashboard/overview">
                            View Agent Feed →
                        </Button>
                        <a
                            href={BASE_SEPOLIA_EXPLORER}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                border: '2px solid #444',
                                borderRadius: 4,
                                padding: '9px 16px',
                                fontSize: 14,
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.7)',
                                textDecoration: 'none',
                                transition: 'border-color 0.12s, color 0.12s, box-shadow 0.12s',
                                boxShadow: '3px 3px 0 #444',
                            }}
                            onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLAnchorElement
                                el.style.borderColor = '#FFE500'
                                el.style.color = '#FFE500'
                                el.style.boxShadow = '3px 3px 0 #FFE500'
                            }}
                            onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLAnchorElement
                                el.style.borderColor = '#444'
                                el.style.color = 'rgba(255,255,255,0.7)'
                                el.style.boxShadow = '3px 3px 0 #444'
                            }}
                        >
                            See on Basescan ↗
                        </a>
                    </div>
                </div>

                {/* Right — Terminal */}
                <div>
                    <div className="terminal-shell">
                        <div className="terminal-header">
                            <div style={{ display: 'flex', gap: 6 }}>
                                <div className="terminal-dot" style={{ background: '#FF5F57' }} />
                                <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
                                <div className="terminal-dot" style={{ background: '#28CA41' }} />
                            </div>
                            <div
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    fontFamily: 'var(--font-dm-mono)',
                                    fontSize: 12,
                                    color: 'rgba(255,255,255,0.3)',
                                }}
                            >
                                zkcomply-agent.eth · live
                            </div>
                        </div>

                        <div className="terminal-body" style={{ minHeight: 330, padding: 20 }}>
                            {terminalLines.map((line, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        gap: 10,
                                        alignItems: 'flex-start',
                                        marginBottom: 10,
                                    }}
                                >
                                    <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontSize: 11 }}>
                                        {line.time}
                                    </span>
                                    {line.agent && (
                                        <span
                                            style={{
                                                color: line.color,
                                                fontWeight: 600,
                                                flexShrink: 0,
                                                fontSize: 11,
                                                minWidth: 68,
                                            }}
                                        >
                                            [{line.agent}]
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            color: line.isLink ? '#60A5FA' : line.agent ? 'rgba(255,255,255,0.65)' : line.color,
                                            textDecoration: line.isLink ? 'underline' : 'none',
                                            fontSize: 11,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {line.msg}
                                        {i === terminalLines.length - 1 && (
                                            <>
                                                {' '}
                                                <span className="cursor-blink" />
                                            </>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media (max-width: 900px) {
          .agent-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
        </section>
    )
}
