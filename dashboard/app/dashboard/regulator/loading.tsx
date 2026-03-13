// app/dashboard/regulator/loading.tsx
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton'

export default function RegulatorLoading() {
    return (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <div style={{ width: 150, height: 26, background: '#FFE500', border: '2px solid #1A1A1A', borderRadius: 4, marginBottom: 12 }} />
                <SkeletonCard lines={5} title />
            </div>
            <div>
                <div style={{ width: 180, height: 26, background: '#FFE500', border: '2px solid #1A1A1A', borderRadius: 4, marginBottom: 12 }} />
                <div style={{ background: '#FFFBF0', border: '3px solid #1A1A1A', borderRadius: 8, padding: 20, boxShadow: '6px 6px 0 #1A1A1A', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={52} style={{ borderRadius: 6 }} />
                    ))}
                </div>
            </div>
        </div>
    )
}
