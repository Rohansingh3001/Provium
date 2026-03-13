// components/ui/Badge.tsx
'use client'
import { clsx } from '@/lib/utils'

interface BadgeProps {
    variant?: 'pink' | 'green' | 'red' | 'yellow' | 'gray' | 'blue'
    children: React.ReactNode
    className?: string
}

const variantClasses = {
    pink: 'badge-pink',
    green: 'badge-green',
    red: 'badge-red',
    yellow: 'badge-yellow',
    gray: 'badge-gray',
    blue: 'badge-blue',
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
    return (
        <span className={clsx('badge', variantClasses[variant], className)}>
            {children}
        </span>
    )
}
