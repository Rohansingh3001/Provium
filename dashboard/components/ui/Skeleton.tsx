// components/ui/Skeleton.tsx
// Neobrutalist-styled skeleton loaders for loading states.

'use client'

interface SkeletonProps {
    width?: string | number
    height?: string | number
    className?: string
    style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 20, className, style }: SkeletonProps) {
    return (
        <div
            className={className}
            style={{
                width,
                height,
                background: 'linear-gradient(90deg, #E8E8E0 25%, #F5F5EE 50%, #E8E8E0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s ease-in-out infinite',
                borderRadius: 4,
                border: '2px solid #D8D8D0',
                ...style,
            }}
        />
    )
}

export function SkeletonCard({ lines = 3, title = true }: { lines?: number; title?: boolean }) {
    return (
        <div
            style={{
                background: '#FFFBF0',
                border: '3px solid #1A1A1A',
                borderRadius: 8,
                boxShadow: '6px 6px 0 #1A1A1A',
                overflow: 'hidden',
            }}
        >
            {/* Card header skeleton */}
            <div
                style={{
                    padding: '16px 20px',
                    borderBottom: '3px solid #1A1A1A',
                    background: '#FFFBF0',
                }}
            >
                {title && <Skeleton width={140} height={16} />}
            </div>
            {/* Card body skeleton */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton
                        key={i}
                        width={i === lines - 1 ? '60%' : '100%'}
                        height={14}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    />
                ))}
            </div>
        </div>
    )
}

export function SkeletonRow() {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 0',
                borderBottom: '2px solid #E8E8E0',
            }}
        >
            <Skeleton width={24} height={24} style={{ flexShrink: 0, borderRadius: 4 }} />
            <Skeleton width="30%" height={14} />
            <Skeleton width="20%" height={14} />
            <Skeleton width="15%" height={14} />
            <Skeleton width={80} height={26} style={{ marginLeft: 'auto' }} />
        </div>
    )
}
