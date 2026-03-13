// components/ui/Card.tsx
'use client'
import { clsx } from '@/lib/utils'

interface CardProps {
    children: React.ReactNode
    className?: string
    noBrutalShadow?: boolean
    onClick?: () => void
}

export function Card({ children, className, noBrutalShadow, onClick }: CardProps) {
    return (
        <div
            className={clsx(
                noBrutalShadow ? 'card-no-shadow' : 'card',
                onClick ? 'cursor-pointer' : '',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    )
}

// ── Convenience sub-components ──────────────────────────────────────────
export function CardHeader({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={clsx(
                'flex items-center justify-between px-6 py-5 border-b-[3px] border-zkblack bg-cream',
                className
            )}
        >
            {children}
        </div>
    )
}

export function CardBody({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return <div className={clsx('p-6', className)}>{children}</div>
}
