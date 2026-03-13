// components/landing/Footer.tsx
'use client'
import { BASE_SEPOLIA_EXPLORER } from '@/lib/wagmi'
import Image from 'next/image'

export function Footer() {
    return (
        <footer
            style={{
                borderTop: '3px solid #1A1A1A',
                padding: '32px 40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                background: '#1A1A1A',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 20, position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
                    <Image src="/logo.svg" alt="Provium Logo" fill style={{ objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>Provium</span>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
                    onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = '#FFE500')}
                    onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)')}
                >
                    GitHub
                </a>
                <a
                    href={BASE_SEPOLIA_EXPLORER}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
                    onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = '#FFE500')}
                    onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)')}
                >
                    Basescan
                </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                    style={{
                        background: '#FFE500',
                        border: '2px solid rgba(255,255,255,0.3)',
                        color: '#1A1A1A',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 4,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                    }}
                >
                    Base
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>ETH Mumbai 2026</span>
            </div>
        </footer>
    )
}
