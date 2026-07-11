// app/layout.tsx — Root layout (server component)
import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const dmSans = DM_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    variable: '--font-dm-sans',
    display: 'swap',
})

const dmMono = DM_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    style: ['normal', 'italic'],
    variable: '--font-dm-mono',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Provium — Autonomous DeFi Compliance',
    description:
        'Autonomous ZK compliance for DeFi lending. Continuous collateral attestation on Base Sepolia.',
    openGraph: {
        title: 'Provium — Autonomous DeFi Compliance',
        description:
            'Prove DeFi compliance without revealing user data. Noir ZK proofs on Base Sepolia.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Provium — Autonomous DeFi Compliance',
        description:
            'Prove DeFi compliance without revealing user data. Noir ZK proofs on Base Sepolia.',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
            <body className="bg-white text-zkblack antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
