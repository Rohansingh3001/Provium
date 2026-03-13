// components/landing/HowItWorks.tsx
'use client'

const steps = [
    {
        n: '01',
        emoji: '👁',
        title: 'Watch',
        desc: 'Watcher agent monitors every position on your lending protocol. Searches DuckDuckGo in real-time for OFAC updates.',
    },
    {
        n: '02',
        emoji: '🧠',
        title: 'Analyze',
        desc: 'Analyst agent powered by Groq Llama 3.3 70B decides what proof is needed and writes plain-English reasoning to store on-chain forever.',
    },
    {
        n: '03',
        emoji: '🔐',
        title: 'Prove',
        desc: 'Reporter agent runs a real Noir ZK circuit via Barretenberg. Constraints verify every position. The math is the auditor.',
    },
    {
        n: '04',
        emoji: '⛓',
        title: 'Deliver',
        desc: 'Proof, aggregate data, and LLM reasoning stored immutably on Base. Regulators get cryptographic proof. Zero user data exposed.',
    },
]

export function HowItWorks() {
    return (
        <section id="how" style={{ padding: '80px 0', background: '#FFFBF0' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
                <div className="section-label" style={{ marginBottom: 16 }}>
                    How It Works
                </div>
                <h2
                    className="section-title"
                    style={{ marginBottom: 48, color: '#1A1A1A' }}
                >
                    Four steps.<br />Zero exposure.
                </h2>

                <div
                    className="grid-border"
                    style={{
                        display: 'flex',
                        background: '#FFFFFF',
                        boxShadow: '8px 8px 0 #1A1A1A',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '3px solid #1A1A1A',
                    }}
                >
                    {steps.map((step, i) => (
                        <div
                            key={i}
                            className="group cursor-pointer"
                            style={{
                                flex: 1,
                                padding: 40,
                                borderRight: i < steps.length - 1 ? '3px solid #1A1A1A' : 'none',
                                minWidth: 0,
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#FFE500' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                        >
                            <div
                                className="transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1 origin-bottom-left"
                                style={{
                                    fontSize: 44,
                                    fontWeight: 900,
                                    letterSpacing: '-2px',
                                    color: '#FF90E8',
                                    lineHeight: 1,
                                    marginBottom: 10,
                                }}
                            >
                                {step.n}
                            </div>
                            <div className="transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6 origin-center" style={{ fontSize: 28, marginBottom: 12 }}>{step.emoji}</div>
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color: '#1A1A1A',
                                    marginBottom: 10,
                                }}
                            >
                                {step.title}
                            </div>
                            <p
                                style={{
                                    fontSize: 14,
                                    lineHeight: 1.65,
                                    color: '#6B6B6B',
                                    margin: 0,
                                }}
                            >
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media (max-width: 768px) {
          #how .grid-border { flex-direction: column !important; }
          #how .grid-border > div { border-right: none !important; border-bottom: 2px solid #1A1A1A; }
          #how .grid-border > div:last-child { border-bottom: none; }
        }
      `}} />
        </section>
    )
}
