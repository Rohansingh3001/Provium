/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Space Grotesk', 'sans-serif'],
                mono: ['Space Mono', 'monospace'],
            },
            colors: {
                cream: '#FFFBF0',
                neon: {
                    pink: '#FF2EEE',
                    green: '#00FF88',
                    yellow: '#FFE600',
                    blue: '#2EE5FF',
                    red: '#FF2E2E',
                },
            },
            boxShadow: {
                'brutal': '5px 5px 0px #0A0A0A',
                'brutal-lg': '8px 8px 0px #0A0A0A',
                'brutal-xl': '12px 12px 0px #0A0A0A',
                'brutal-pink': '5px 5px 0px #FF2EEE',
                'brutal-green': '5px 5px 0px #00FF88',
                'brutal-yellow': '5px 5px 0px #FFE600',
                'brutal-blue': '5px 5px 0px #2EE5FF',
            },
            borderWidth: { '3': '3px' },
            animation: {
                'float-in': 'float-in 0.35s ease-out forwards',
                'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
