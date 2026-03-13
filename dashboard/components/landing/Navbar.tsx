// components/landing/Navbar.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { BASE_SEPOLIA_EXPLORER } from '@/lib/wagmi'
import Image from 'next/image'

export function Navbar() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 0)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 pointer-events-none transition-all duration-300">
            <nav
                className={`max-w-[1280px] w-full mx-auto flex items-center justify-between rounded-none md:rounded-none border-[3px] border-zkblack transition-all duration-200 pointer-events-auto ${
                    scrolled
                        ? 'bg-white/90 backdrop-blur-md shadow-[4px_4px_0_#1A1A1A] py-3 px-6'
                        : 'bg-[#FFFBF0] shadow-[6px_6px_0_#1A1A1A] py-4 px-6 md:px-8 translate-y-2'
                    }`}
                style={{ minWidth: 0 }}
            >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 no-underline">
                    <div
                        className="flex items-center justify-center bg-zkblack rounded-md overflow-hidden relative"
                        style={{ width: 32, height: 32 }}
                    >
                        <Image src="/logo.svg" alt="Provium Logo" fill style={{ objectFit: 'contain' }} />
                    </div>
                    <span
                        style={{
                            fontFamily: 'var(--font-dm-sans)',
                            fontSize: 20,
                            fontWeight: 800,
                            letterSpacing: '-0.5px',
                            color: '#1A1A1A',
                        }}
                    >
                        Provium
                    </span>
                </Link>

                <div className="hidden lg:flex items-center gap-4">
                    <a href="#how" className="text-[13px] font-bold text-zkmuted hover:text-zkblack hover:bg-yellow hover:border-zkblack transition-all no-underline py-1.5 px-3 border-2 border-transparent rounded hover:shadow-[2px_2px_0_#1A1A1A]">
                        How It Works
                    </a>
                    <a href="#agent" className="text-[13px] font-bold text-zkmuted hover:text-zkblack hover:bg-yellow hover:border-zkblack transition-all no-underline py-1.5 px-3 border-2 border-transparent rounded hover:shadow-[2px_2px_0_#1A1A1A]">
                        Agent
                    </a>
                    <a href="#regulator" className="text-[13px] font-bold text-zkmuted hover:text-zkblack hover:bg-yellow hover:border-zkblack transition-all no-underline py-1.5 px-3 border-2 border-transparent rounded hover:shadow-[2px_2px_0_#1A1A1A]">
                        Regulator Portal
                    </a>
                    <div style={{ width: 3, height: 20, background: '#1A1A1A', borderRadius: 1 }} />
                    <span
                        className="inline-flex items-center gap-1.5"
                        style={{
                            background: '#FFE500',
                            color: '#1A1A1A',
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '5px 12px',
                            borderRadius: 4,
                            letterSpacing: '1px',
                            border: '2px solid #1A1A1A',
                            boxShadow: '2px 2px 0 #1A1A1A',
                            textTransform: 'uppercase',
                        }}
                    >
                        Base Sepolia
                    </span>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        href={BASE_SEPOLIA_EXPLORER}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden md:inline-flex"
                    >
                        Basescan ↗
                    </Button>
                    <Button variant="black" size="sm" href="/dashboard">
                        Open Dashboard →
                    </Button>
                </div>
            </nav>
        </div>
    )
}
