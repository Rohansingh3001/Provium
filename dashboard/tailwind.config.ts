// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                pink:     '#FF90E8',
                yellow:   '#FFE500',
                cream:    '#FFFBF0',
                zkblack:  '#1A1A1A',
                zkgreen:  '#00C896',
                zkred:    '#FF3B30',
                zkgray:   '#F5F5F0',
                zkmuted:  '#6B6B6B',
            },
            fontFamily: {
                sans: ['var(--font-dm-sans)', 'sans-serif'],
                mono: ['var(--font-dm-mono)', 'monospace'],
            },
            boxShadow: {
                brutal:        '6px 6px 0 #1A1A1A',
                'brutal-sm':   '3px 3px 0 #1A1A1A',
                'brutal-md':   '8px 8px 0 #1A1A1A',
                'brutal-lg':   '12px 12px 0 #1A1A1A',
                'brutal-pink': '6px 6px 0 #FF90E8',
                'brutal-yellow':'6px 6px 0 #FFE500',
            },
            borderWidth: {
                '3': '3px',
            },
            animation: {
                'fade-up': 'fadeUp 0.5s ease both',
                'blink': 'blink 1s infinite',
                'ticker': 'ticker 22s linear infinite',
                'pulse-dot': 'pulseDot 2s infinite',
                'spin-slow': 'spin 2s linear infinite',
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                ticker: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                pulseDot: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
                    '50%': { transform: 'scale(0.8)', opacity: '0.4' },
                },
            },
        },
    },
    plugins: [],
}

export default config
