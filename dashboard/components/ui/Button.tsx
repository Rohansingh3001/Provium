// components/ui/Button.tsx
'use client'
import { clsx } from '@/lib/utils'
import Link from 'next/link'

interface ButtonProps {
    variant?: 'black' | 'outline' | 'pink' | 'yellow' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
    onClick?: () => void
    href?: string
    disabled?: boolean
    isLoading?: boolean
    className?: string
    style?: React.CSSProperties
    type?: 'button' | 'submit' | 'reset'
    target?: string
    rel?: string
}

const variantClasses = {
    black: 'btn-black',
    outline: 'btn-outline',
    pink: 'btn-pink',
    yellow: 'btn-yellow',
    ghost: 'btn-ghost',
}

const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
}

export function Button({
    variant = 'black',
    size = 'md',
    children,
    onClick,
    href,
    disabled,
    isLoading,
    className,
    style,
    type = 'button',
    target,
    rel,
}: ButtonProps) {
    const classes = clsx(
        'btn',
        variantClasses[variant],
        sizeClasses[size],
        (disabled || isLoading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        className
    )

    const content = isLoading ? (
        <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
        </>
    ) : (
        children
    )

    if (href) {
        return (
            <Link href={href} className={classes} style={style} target={target} rel={rel}>
                {content}
            </Link>
        )
    }

    return (
        <button
            type={type}
            className={classes}
            style={style}
            onClick={onClick}
            disabled={disabled || isLoading}
        >
            {content}
        </button>
    )
}
