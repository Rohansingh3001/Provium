// lib/hooks/useProofHistory.ts
'use client'
import { useReadContract } from 'wagmi'
import { useMemo } from 'react'
import { ADDRESSES, REGISTRY_ABI } from '@/lib/contracts'
import type { ComplianceReport } from '@/lib/types'

export function useProofHistory() {
    const { data: rawReports, isLoading } = useReadContract({
        address: ADDRESSES.ComplianceRegistry,
        abi: REGISTRY_ABI,
        functionName: 'getAllReports',
        query: { refetchInterval: 30_000 },
    })

    const reports: ComplianceReport[] = useMemo(() => {
        if (!rawReports) return []
        // Reverse to get newest first
        return [...(rawReports as ComplianceReport[])].reverse()
    }, [rawReports])

    return { reports, isLoading }
}
