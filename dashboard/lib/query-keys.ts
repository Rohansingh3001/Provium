// lib/query-keys.ts
// Centralized query key factory — prevents magic string duplication across hooks.
// Usage: queryKeys.compliance.allReports() → ['compliance', 'allReports']
//
// These keys are consumed by wagmi's useReadContract via the `queryKey` option
// and by TanStack Query for manual invalidation / optimistic updates.

export const queryKeys = {
    compliance: {
        all:          () => ['compliance'] as const,
        allReports:   () => ['compliance', 'allReports'] as const,
        latestReport: () => ['compliance', 'latestReport'] as const,
        reportCount:  () => ['compliance', 'reportCount'] as const,
        isCompliant:  () => ['compliance', 'isCompliant'] as const,
        stats:        () => ['compliance', 'stats'] as const,
    },
    regulator: {
        all:            () => ['regulator'] as const,
        pendingRequests:() => ['regulator', 'pendingRequests'] as const,
    },
    lending: {
        all:            () => ['lending'] as const,
        userCount:      () => ['lending', 'userCount'] as const,
        userAtIndex:    (i: number) => ['lending', 'userAtIndex', i] as const,
        totalCollateral:() => ['lending', 'totalCollateral'] as const,
        totalDebt:      () => ['lending', 'totalDebt'] as const,
        position:       (address: string) => ['lending', 'position', address] as const,
        healthFactor:   (address: string) => ['lending', 'healthFactor', address] as const,
    },
} as const
