// lib/hooks/useAgentFeed.ts
'use client'
import { useWatchContractEvent } from 'wagmi'
import { useState } from 'react'
import { toast } from 'sonner'
import { ADDRESSES, REGISTRY_ABI, PORTAL_ABI } from '@/lib/contracts'
import type { AgentEvent } from '@/lib/types'

const MAX_EVENTS = 20

export function useAgentFeed() {
    const [events, setEvents] = useState<AgentEvent[]>([])
    const [isWatching, setIsWatching] = useState(true)

    function addEvent(event: AgentEvent) {
        setEvents((prev) => {
            const next = [event, ...prev]
            return next.slice(0, MAX_EVENTS)
        })
    }

    useWatchContractEvent({
        address: ADDRESSES.ComplianceRegistry,
        abi: REGISTRY_ABI,
        eventName: 'ReportSubmitted',
        onLogs(logs) {
            setIsWatching(true)
            for (const log of logs) {
                const args = log.args as {
                    reportId?: bigint
                    isCompliant?: boolean
                    ratioBps?: bigint
                    agentReasoning?: string
                }
                const id = args.reportId ? Number(args.reportId) : '?'
                const pct = args.ratioBps ? (Number(args.ratioBps) / 100).toFixed(1) : '?'
                if (args.isCompliant) {
                    toast.success(`Proof #${id} submitted — ${pct}% collateral ✓`, { duration: 6000 })
                } else {
                    toast.error(`VIOLATION proof #${id} — ratio ${pct}% below minimum`, { duration: 8000 })
                }
                addEvent({
                    id: `proof_submitted-${log.transactionHash}-${Date.now()}`,
                    type: 'proof_submitted',
                    reportId: args.reportId ? Number(args.reportId) : undefined,
                    isCompliant: args.isCompliant,
                    ratioBps: args.ratioBps,
                    agentReasoning: args.agentReasoning,
                    txHash: log.transactionHash ?? '',
                    timestamp: Date.now(),
                    blockNumber: log.blockNumber ?? 0n,
                })
            }
        },
    })

    useWatchContractEvent({
        address: ADDRESSES.ComplianceRegistry,
        abi: REGISTRY_ABI,
        eventName: 'ViolationRecorded',
        onLogs(logs) {
            for (const log of logs) {
                const args = log.args as { reportId?: bigint; ratioBps?: bigint }
                const pct = args.ratioBps ? (Number(args.ratioBps) / 100).toFixed(1) : '?'
                toast.error(`⚠ Violation recorded — ratio ${pct}%`, { duration: 8000 })
                addEvent({
                    id: `violation_recorded-${log.transactionHash}-${Date.now()}`,
                    type: 'violation_recorded',
                    reportId: args.reportId ? Number(args.reportId) : undefined,
                    ratioBps: args.ratioBps,
                    txHash: log.transactionHash ?? '',
                    timestamp: Date.now(),
                    blockNumber: log.blockNumber ?? 0n,
                })
            }
        },
    })

    useWatchContractEvent({
        address: ADDRESSES.RegulatorPortal,
        abi: PORTAL_ABI,
        eventName: 'RequestFulfilled',
        onLogs(logs) {
            for (const log of logs) {
                const args = log.args as { requestId?: bigint; agentReasoning?: string }
                const rid = args.requestId ? Number(args.requestId) : '?'
                toast(`Regulator request #${rid} fulfilled`, {
                    duration: 6000,
                    style: { background: '#1A1A1A', color: '#FFE500', border: '2px solid #FFE500', boxShadow: '4px 4px 0 #FFE500' },
                })
                addEvent({
                    id: `request_fulfilled-${log.transactionHash}-${Date.now()}`,
                    type: 'request_fulfilled',
                    requestId: args.requestId ? Number(args.requestId) : undefined,
                    agentReasoning: args.agentReasoning,
                    txHash: log.transactionHash ?? '',
                    timestamp: Date.now(),
                    blockNumber: log.blockNumber ?? 0n,
                })
            }
        },
    })

    return { events, isWatching }
}
