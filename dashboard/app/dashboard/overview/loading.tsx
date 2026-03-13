// app/dashboard/overview/loading.tsx
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function OverviewLoading() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Section label */}
            <div>
                <div style={{ width: 100, height: 24, background: '#FFE500', border: '2px solid #1A1A1A', borderRadius: 4, marginBottom: 12 }} />
                <SkeletonCard lines={2} title />
            </div>
            <div>
                <div style={{ width: 160, height: 24, background: '#FFE500', border: '2px solid #1A1A1A', borderRadius: 4, marginBottom: 12 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                    <SkeletonCard lines={4} title />
                    <SkeletonCard lines={3} title />
                </div>
            </div>
            <div>
                <div style={{ width: 120, height: 24, background: '#FFE500', border: '2px solid #1A1A1A', borderRadius: 4, marginBottom: 12 }} />
                <SkeletonCard lines={5} title />
            </div>
        </div>
    )
}
