// components/landing/FTXSection.tsx
'use client'

export function FTXSection() {
    return (
        <section
            style={{
                width: '100%',
                background: '#1A1A1A',
                color: 'white',
                padding: '80px 40px',
                textAlign: 'center',
                borderTop: '3px solid #1A1A1A',
                borderBottom: '3px solid #1A1A1A',
            }}
        >
            <div
                style={{
                    fontSize: 'clamp(14px, 2vw, 20px)',
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '6px',
                    textTransform: 'uppercase',
                    marginBottom: 40,
                }}
            >
                Tornado Cash · BitMEX · ShapeShift
            </div>

            <div
                style={{
                    display: 'inline-block',
                    border: '2px solid #333',
                    borderRadius: 6,
                    boxShadow: '4px 4px 0 #333',
                    padding: '20px 40px',
                    fontFamily: 'var(--font-dm-mono)',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.35)',
                    marginBottom: 40,
                    textAlign: 'left',
                }}
            >
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#FF3B30', fontWeight: 800, fontSize: 16 }}>✕</span>
                    <span>User data: [ exposed to regulators ]</span>
                </div>
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#FF3B30', fontWeight: 800, fontSize: 16 }}>✕</span>
                    <span>Compliance proof: [ none ]</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#FF3B30', fontWeight: 800, fontSize: 16 }}>✕</span>
                    <span>Fine: $750,000+</span>
                </div>
            </div>

            <h2
                style={{
                    fontSize: 'clamp(36px, 5vw, 60px)',
                    fontWeight: 900,
                    letterSpacing: '-2px',
                    lineHeight: 1.05,
                    marginBottom: 16,
                }}
            >
                All fined.{' '}
                <span style={{ color: '#FF90E8', textShadow: '2px 2px 0 rgba(255,255,255,0.1)' }}>None had ZK.</span>
            </h2>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#FFE500' }}>
                Provium changes that.
            </p>
        </section>
    )
}
