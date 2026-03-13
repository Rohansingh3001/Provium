// app/dashboard/overview/page.tsx
'use client'
import { AgentStatusCard } from '@/components/dashboard/AgentStatusCard'
import { ComplianceCard } from '@/components/dashboard/ComplianceCard'
import { ProtocolStatsCard } from '@/components/dashboard/ProtocolStatsCard'
import { AgentBrainFeed } from '@/components/dashboard/AgentBrainFeed'

export default function OverviewPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            <div className="animate-slide-in">
                <div className="dash-section-label">Live status</div>
                <AgentStatusCard />
            </div>

            <div className="animate-slide-in stagger-1">
                <div className="dash-section-label">Compliance & protocol</div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr',
                        gap: 24,
                    }}
                    className="overview-grid"
                >
                    <ComplianceCard />
                    <ProtocolStatsCard />
                </div>
            </div>

            <div className="animate-slide-in stagger-2">
                <div className="dash-section-label">Agent activity</div>
                <AgentBrainFeed />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media (max-width: 1024px) {
          .overview-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
        </div>
    )
}
