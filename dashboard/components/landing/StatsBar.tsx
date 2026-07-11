// components/landing/StatsBar.tsx
'use client'

const stats = [
    { value: '$750K', label: 'ShapeShift OFAC settlement, Sept 2025' },
    { value: '150%', label: 'Protocol collateral minimum (configurable)' },
    { value: '60s', label: 'Default agent epoch interval' },
    { value: '0', label: 'Individual positions revealed in proofs' },
]

export function StatsBar() {
    return (
        <div
            style={{
                background: '#1A1A1A',
                color: 'white',
                padding: '32px 40px',
                borderTop: '3px solid #1A1A1A',
                borderBottom: '3px solid #1A1A1A',
                display: 'flex',
                justifyContent: 'center',
                gap: 0,
                flexWrap: 'wrap',
            }}
        >
            {stats.map((s, i) => (
                <div
                    key={s.value}
                    style={{
                        textAlign: 'center',
                        padding: '8px 48px',
                        borderRight: i < stats.length - 1 ? '2px solid #333' : 'none',
                    }}
                >
                    <div
                        style={{
                            fontSize: 'clamp(40px, 4vw, 56px)',
                            fontWeight: 900,
                            letterSpacing: '-2px',
                            color: i % 2 === 0 ? '#FF90E8' : '#FFE500',
                            lineHeight: 1,
                        }}
                    >
                        {s.value}
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.4)',
                            marginTop: 8,
                            maxWidth: 160,
                            lineHeight: 1.4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}
                    >
                        {s.label}
                    </div>
                </div>
            ))}
        </div>
    )
}
