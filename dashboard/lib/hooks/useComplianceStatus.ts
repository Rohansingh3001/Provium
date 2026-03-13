// lib/hooks/useComplianceStatus.ts
'use client'
import { useReadContract } from 'wagmi'
import { useMemo, useEffect } from 'react'
import { ADDRESSES, REGISTRY_ABI } from '@/lib/contracts'
import type { ComplianceReport } from '@/lib/types'
import { secondsSince, bpsToPercent } from '@/lib/utils'
import { useNotificationStore } from '@/lib/store'

export function useComplianceStatus() {
    const { data: isCompliant, isLoading: loadingCompliant } = useReadContract({
        address: ADDRESSES.ComplianceRegistry,
        abi: REGISTRY_ABI,
        functionName: 'isCurrentlyCompliant',
        query: { refetchInterval: 30_000 },
    })

    const { data: latestReportRaw, isLoading: loadingReport } = useReadContract({
        address: ADDRESSES.ComplianceRegistry,
        abi: REGISTRY_ABI,
        functionName: 'getLatestReport',
        query: { refetchInterval: 30_000 },
    })

    const { data: reportCountRaw, isLoading: loadingCount } = useReadContract({
        address: ADDRESSES.ComplianceRegistry,
        abi: REGISTRY_ABI,
        functionName: 'getReportCount',
        query: { refetchInterval: 30_000 },
    })

    const latestReport = latestReportRaw as ComplianceReport | undefined

    const ratioBps = latestReport?.ratioBps ?? 0n
    const ratioPct = useMemo(() => bpsToPercent(ratioBps), [ratioBps])

    const secondsSinceLastProof = useMemo(
        () => secondsSince(latestReport?.timestamp),
        [latestReport?.timestamp]
    )

    const reportCount = reportCountRaw ? Number(reportCountRaw) : 0
    const lastProofBlock = latestReport?.blockNumber
        ? Number(latestReport.blockNumber)
        : 0

    // Keep notification store in sync with on-chain report count
    const setCurrentCount = useNotificationStore((s) => s.setCurrentCount)
    useEffect(() => {
        if (reportCount > 0) setCurrentCount(reportCount)
    }, [reportCount, setCurrentCount])

    const isLoading = loadingCompliant || loadingReport || loadingCount

    return {
        isCompliant: isCompliant ?? true,
        ratioBps,
        ratioPct,
        latestReport,
        reportCount,
        isLoading,
        secondsSinceLastProof,
        lastProofBlock,
    }
}
