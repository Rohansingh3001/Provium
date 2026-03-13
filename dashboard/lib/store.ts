// lib/store.ts
// Global client-side state via Zustand.
// - Notification badge: counts new proofs since user last visited Proof History
// - Active proof panel: which proof's reasoning side-panel is open
// - Sidebar collapsed state (mobile)

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ── Notification state ────────────────────────────────────────────────────────

interface NotificationState {
    // Number of on-chain reports when the user last viewed Proof History
    lastSeenReportCount: number
    // Current on-chain report count (updated by useComplianceStatus)
    currentReportCount: number
    // Computed: how many new proofs since last visit
    newProofCount: () => number
    // Call when user visits Proof History
    markSeen: () => void
    // Called by useComplianceStatus when it gets a new count
    setCurrentCount: (n: number) => void
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            lastSeenReportCount: 0,
            currentReportCount: 0,
            newProofCount: () => {
                const { currentReportCount, lastSeenReportCount } = get()
                const diff = currentReportCount - lastSeenReportCount
                return diff > 0 ? diff : 0
            },
            markSeen: () =>
                set((s) => ({ lastSeenReportCount: s.currentReportCount })),
            setCurrentCount: (n: number) =>
                set({ currentReportCount: n }),
        }),
        {
            name: 'provium-notifications',
            storage: createJSONStorage(() =>
                typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
            ),
            // Only persist the lastSeen counter — currentCount is always live
            partialize: (s) => ({ lastSeenReportCount: s.lastSeenReportCount }),
            skipHydration: false,
        }
    )
)

// ── Proof detail panel ────────────────────────────────────────────────────────

interface PanelState {
    // ID of the proof whose reasoning is displayed in the side panel (null = closed)
    activePanelProofId: number | null
    openPanel: (id: number) => void
    closePanel: () => void
}

export const usePanelStore = create<PanelState>()((set) => ({
    activePanelProofId: null,
    openPanel: (id) => set({ activePanelProofId: id }),
    closePanel: () => set({ activePanelProofId: null }),
}))

// ── Sidebar collapse (mobile) ─────────────────────────────────────────────────

interface SidebarState {
    isCollapsed: boolean
    toggle: () => void
    collapse: () => void
    expand: () => void
}

export const useSidebarStore = create<SidebarState>()((set) => ({
    isCollapsed: false,
    toggle: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
    collapse: () => set({ isCollapsed: true }),
    expand: () => set({ isCollapsed: false }),
}))
