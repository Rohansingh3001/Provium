// app/dashboard/regulator/page.tsx
'use client'
import { RegulatorForm } from '@/components/dashboard/RegulatorForm'
import { RequestList } from '@/components/dashboard/RequestList'

export default function RegulatorPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div className="dash-section-label">Regulator portal</div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(400px, 1fr) 2fr',
                    gap: 28,
                }}
                className="regulator-grid"
            >
                <RegulatorForm />
                <RequestList />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media (max-width: 1024px) {
          .regulator-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
        </div>
    )
}
