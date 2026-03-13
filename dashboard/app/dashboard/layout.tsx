// app/dashboard/layout.tsx
'use client'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopBar } from '@/components/dashboard/TopBar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Fixed Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden',
                    background: '#FFFBF0', // Cream neobrutalist canvas
                }}
            >
                <TopBar />

                {/* Scrollable Page Content */}
                <main
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '40px 44px',
                        maxWidth: 1600,
                        margin: '0 auto',
                        width: '100%',
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    )
}
