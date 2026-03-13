// lib/types.ts
export interface ComplianceReport {
    reportId: bigint
    proofType: number
    trigger: number // 0=routine, 1=urgent, 2=critical, 3=regulator
    blockNumber: bigint
    proofHash: `0x${string}`
    isCompliant: boolean
    totalCollateral: bigint
    totalDebt: bigint
    ratioBps: bigint
    jurisdiction: string
    agentReasoning: string
    timestamp: bigint
    agentAddress: `0x${string}`
    requestId: bigint
}

export interface ComplianceRequest {
    requestId: bigint
    requestor: `0x${string}`
    proofType: number
    targetBlock: bigint
    jurisdiction: string
    requestedAt: bigint
    deadline: bigint
    fulfilled: boolean
    fulfilledAt: bigint
    proofHash: `0x${string}`
    agentReasoning: string
}

export interface AgentEvent {
    id: string
    type: 'proof_submitted' | 'violation_recorded' | 'request_fulfilled'
    reportId?: number
    requestId?: number
    isCompliant?: boolean
    ratioBps?: bigint
    agentReasoning?: string
    txHash: string
    timestamp: number
    blockNumber: bigint
}

export type SimulationState =
    | 'idle'
    | 'triggered'
    | 'detecting'
    | 'proven'
    | 'recorded'
