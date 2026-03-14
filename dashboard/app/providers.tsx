// app/providers.tsx
'use client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { Toaster } from 'sonner'
import { config } from '@/lib/wagmi'
import { validateAddresses } from '@/lib/contracts'
import { useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'

// Validate contract env vars once at module load — logs a clear warning if any are missing.
validateAddresses()

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // On-chain data is valid for 30 seconds before considered stale
                staleTime: 30_000,
                // Keep unused cache entries for 5 minutes before GC
                gcTime: 5 * 60 * 1000,
                // Retry with exponential backoff, capped at 30s
                retry: 3,
                retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
                // Don't refetch on window focus — chain data drives updates
                refetchOnWindowFocus: false,
                // Still refetch on reconnect (e.g. laptop wakes up)
                refetchOnReconnect: true,
            },
            mutations: {
                retry: 0,
            },
        },
    })
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => makeQueryClient())

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#FF90E8',
                        accentColorForeground: '#1A1A1A',
                        borderRadius: 'small',
                    })}
                >
                    {children}
                    {/* Toast notifications — neobrutalist style */}
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: '#1A1A1A',
                                color: '#FFFBF0',
                                border: '2px solid #1A1A1A',
                                borderRadius: '4px',
                                boxShadow: '4px 4px 0 #FFE500',
                                fontFamily: 'var(--font-dm-mono)',
                                fontSize: '13px',
                                fontWeight: 600,
                            },
                        }}
                        richColors
                        closeButton
                    />
                    {/* TanStack Query devtools — only in development */}
                    {process.env.NODE_ENV === 'development' && (
                        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
                    )}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}
