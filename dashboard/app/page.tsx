// app/page.tsx
'use client'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { StatsBar } from '@/components/landing/StatsBar'
import { ProblemSection } from '@/components/landing/ProblemSection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { AgentShowcase } from '@/components/landing/AgentShowcase'
import { RegulatorPreview } from '@/components/landing/RegulatorPreview'
import { FTXSection } from '@/components/landing/FTXSection'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
    return (
        <main className="bg-white min-h-screen">
            <Navbar />
            <Hero />
            <StatsBar />
            <ProblemSection />
            <HowItWorks />
            <AgentShowcase />
            <RegulatorPreview />
            <FTXSection />
            <FinalCTA />
            <Footer />
        </main>
    )
}
