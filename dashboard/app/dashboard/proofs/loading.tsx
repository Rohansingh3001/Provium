// app/dashboard/proofs/loading.tsx
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function ProofsLoading() {
    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div>
                    <div style={{ width: 120, height: 26, background: '#FFE500', border: '2px solid #1A1A1A', borderRadius: 4, marginBottom: 8 }} />
                    <Skeleton width={120} height={26} />
                </div>
            </div>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[80, 70, 90, 80].map((w, i) => (
                    <Skeleton key={i} width={w} height={32} style={{ borderRadius: 4 }} />
                ))}
            </div>
            {/* Rows */}
            <div style={{ background: '#FFFBF0', border: '3px solid #1A1A1A', borderRadius: 8, padding: '0 20px', boxShadow: '6px 6px 0 #1A1A1A' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                ))}
            </div>
        </div>
    )
}
