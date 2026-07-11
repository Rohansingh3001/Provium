// components/landing/LiveTicker.tsx
'use client'
import { PulsingDot } from '@/components/ui/PulsingDot'

const ITEMS = [
    { prefix: '✓', text: ' Collateral proof · block ', highlight: '#18,294,847', suffix: ' · ratio ', hl2: '171%', rest: ' · 23s ago' },
    { prefix: '✓', text: ' Request #14 fulfilled · ', highlight: 'compliance.eth', suffix: ' · 4min ago', hl2: '', rest: '' },
    { prefix: '✓', text: ' All 5 positions above ', highlight: '150%', suffix: ' protocol minimum', hl2: '', rest: '' },
    { prefix: '✓', text: ' Agent reasoning stored on-chain · tx ', highlight: '0x4f2a...8c3b', suffix: ' ↗', hl2: '', rest: '' },
    { prefix: '✓', text: ' Collateral proof · block ', highlight: '#18,294,847', suffix: ' · ratio ', hl2: '171%', rest: ' · 23s ago' },
    { prefix: '✓', text: ' Request #14 fulfilled · ', highlight: 'compliance.eth', suffix: ' · 4min ago', hl2: '', rest: '' },
    { prefix: '✓', text: ' All 5 positions above ', highlight: '150%', suffix: ' protocol minimum', hl2: '', rest: '' },
    { prefix: '✓', text: ' Agent reasoning stored on-chain · tx ', highlight: '0x4f2a...8c3b', suffix: ' ↗', hl2: '', rest: '' },
]

export function LiveTicker() {
    return (
        <div
            className="flex items-center gap-3 overflow-hidden"
            style={{
                background: '#1A1A1A',
                border: '3px solid #1A1A1A',
                borderRadius: 6,
                padding: '10px 14px',
                boxShadow: '4px 4px 0 #FF90E8',
            }}
        >
            <PulsingDot color="green" size="sm" />
            <div className="overflow-hidden flex-1" style={{ minWidth: 0 }}>
                <div className="ticker-track gap-10" style={{ display: 'flex', gap: 48 }}>
                    {ITEMS.map((item, i) => (
                        <span
                            key={i}
                            className="shrink-0"
                            style={{
                                fontFamily: 'var(--font-dm-mono)',
                                fontSize: 12,
                                color: 'rgba(255,255,255,0.5)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ color: '#00C896', fontWeight: 700 }}>{item.prefix}</span>
                            {item.text}
                            <span style={{ color: '#FFE500', fontWeight: 600 }}>{item.highlight}</span>
                            {item.suffix}
                            {item.hl2 && (
                                <span style={{ color: '#FFE500', fontWeight: 600 }}>{item.hl2}</span>
                            )}
                            {item.rest}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}
