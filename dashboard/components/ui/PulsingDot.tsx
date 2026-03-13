// components/ui/PulsingDot.tsx
'use client'
import { clsx } from '@/lib/utils'

interface PulsingDotProps {
    color?: 'green' | 'red' | 'yellow'
    size?: 'sm' | 'md'
    className?: string
}

const colorMap = {
    green: 'pulse-dot-green',
    red: 'pulse-dot-red',
    yellow: 'pulse-dot-yellow',
}

const sizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
}

export function PulsingDot({
    color = 'green',
    size = 'md',
    className,
}: PulsingDotProps) {
    return (
        <span
            className={clsx(
                'pulse-dot inline-block flex-shrink-0',
                colorMap[color],
                sizeMap[size],
                className
            )}
        />
    )
}
