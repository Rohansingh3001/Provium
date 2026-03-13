// lib/hooks/useRegulatorRequests.ts
'use client'
import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { useState, useCallback } from 'react'
import { ADDRESSES, PORTAL_ABI } from '@/lib/contracts'
import type { ComplianceRequest } from '@/lib/types'

export function useRegulatorRequests() {
    const [submitTxHash, setSubmitTxHash] = useState<string | undefined>()
    const [error, setError] = useState<Error | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)

    const {
        data: pendingRaw,
        isLoading,
        refetch,
    } = useReadContract({
        address: ADDRESSES.RegulatorPortal,
        abi: PORTAL_ABI,
        functionName: 'getPendingRequests',
        query: { refetchInterval: 15_000 },
    })

    const { writeContractAsync, isPending: isSubmitting } = useWriteContract()

    // Watch for fulfillment events to trigger refresh
    useWatchContractEvent({
        address: ADDRESSES.RegulatorPortal,
        abi: PORTAL_ABI,
        eventName: 'RequestFulfilled',
        onLogs: () => {
            refetch()
        },
    })

    const allRequests: ComplianceRequest[] = (pendingRaw as ComplianceRequest[] | undefined) ?? []
    const pendingRequests = allRequests.filter((r) => !r.fulfilled)

    const submitRequest = useCallback(
        async (
            proofType: number,
            targetBlock: bigint,
            jurisdiction: string
        ): Promise<string | undefined> => {
            setError(null)
            setIsSuccess(false)
            try {
                const hash = await writeContractAsync({
                    address: ADDRESSES.RegulatorPortal,
                    abi: PORTAL_ABI,
                    functionName: 'requestComplianceProof',
                    args: [proofType, targetBlock, jurisdiction],
                })
                setSubmitTxHash(hash)
                setIsSuccess(true)
                await refetch()
                return hash
            } catch (e) {
                const err = e instanceof Error ? e : new Error('Transaction failed')
                setError(err)
                throw err
            }
        },
        [writeContractAsync, refetch]
    )

    return {
        pendingRequests,
        allRequests,
        submitRequest,
        isSubmitting,
        submitTxHash,
        isSuccess,
        error,
        isLoading,
        refetch,
    }
}
