// app/dashboard/simulate/page.tsx
'use client'
import { ViolationSimulator } from '@/components/dashboard/ViolationSimulator'

export default function SimulatePage() {
    return (
        <div style={{ paddingBottom: 64 }}>
            <div className="dash-section-label">Violation simulator</div>
            <ViolationSimulator />
        </div>
    )
}
