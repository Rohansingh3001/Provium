// components/landing/ProblemSection.tsx
'use client'

const cells = [
    {
        number: '$750K',
        title: 'ShapeShift Settlement · 2025',
        desc: 'OFAC fined ShapeShift $750K for processing 17,183 transactions with users in sanctioned jurisdictions (2016–2018). Regulators expect provable, auditable compliance — not trust-me spreadsheets.',
    },
    {
        number: '1:1',
        title: 'GENIUS Act Reserve Standard',
        desc: 'The GENIUS Act requires stablecoin issuers to maintain 1:1 reserve backing with monthly public attestations. Continuous, verifiable proof is becoming the regulatory baseline.',
    },
    {
        number: 'ZK',
        title: 'Privacy-Preserving Attestation',
        desc: 'Traditional audits expose every position. Provium proves protocol-level solvency with Noir ZK circuits and stores the agent\'s reasoning permanently on-chain alongside each proof.',
    },
]

export function ProblemSection() {
    return (
        <section id="problem" style={{ padding: '80px 0' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
                <div className="section-label" style={{ marginBottom: 16 }}>
                    The Problem
                </div>
                <h2
                    className="section-title"
                    style={{ marginBottom: 48, color: '#1A1A1A' }}
                >
                    DeFi&apos;s impossible<br />compliance choice.
                </h2>

                <div className="grid-border" style={{ display: 'flex' }}>
                    {cells.map((cell, i) => (
                        <div
                            key={i}
                            className="group cursor-pointer transition-all duration-200"
                            style={{
                                flex: 1,
                                padding: 40,
                                borderRight: i < cells.length - 1 ? '3px solid #1A1A1A' : 'none',
                                background: 'white',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#FFE500' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                        >
                            <div
                                className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 origin-left"
                                style={{
                                    fontSize: 52,
                                    fontWeight: 900,
                                    letterSpacing: '-3px',
                                    color: '#FF3B30',
                                    lineHeight: 1,
                                    marginBottom: 12,
                                }}
                            >
                                {cell.number}
                            </div>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: '#1A1A1A',
                                    marginBottom: 10,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {cell.title}
                            </div>
                            <p
                                style={{
                                    fontSize: 14,
                                    lineHeight: 1.65,
                                    color: '#6B6B6B',
                                    margin: 0,
                                }}
                            >
                                {cell.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media (max-width: 768px) {
          .grid-border { flex-direction: column !important; }
          .grid-border .grid-cell { border-right: none !important; border-bottom: 2px solid #1A1A1A; }
          .grid-border .grid-cell:last-child { border-bottom: none; }
        }
      `}} />
        </section>
    )
}
