// lib/contracts.ts
// Contract addresses are loaded from NEXT_PUBLIC_* env vars (.env.local).
// All contracts are deployed on Base Sepolia (chain ID 84532).

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const ADDRESSES = {
    LendingProtocol: (process.env.NEXT_PUBLIC_LENDING_PROTOCOL || ZERO_ADDRESS) as `0x${string}`,
    RegulatorPortal: (process.env.NEXT_PUBLIC_REGULATOR_PORTAL || ZERO_ADDRESS) as `0x${string}`,
    ComplianceRegistry: (process.env.NEXT_PUBLIC_COMPLIANCE_REGISTRY || ZERO_ADDRESS) as `0x${string}`,
    UltraVerifier: (process.env.NEXT_PUBLIC_ULTRA_VERIFIER || ZERO_ADDRESS) as `0x${string}`,
}

/**
 * Warn in development if any contract address is missing from .env.local.
 * Call this once at app startup (e.g. in providers.tsx).
 * Returns true if all addresses are configured, false otherwise.
 */
export function validateAddresses(): boolean {
    const missing = Object.entries(ADDRESSES)
        .filter(([, addr]) => addr === ZERO_ADDRESS)
        .map(([name]) => `NEXT_PUBLIC_${name.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '')}`)

    if (missing.length > 0) {
        const msg = `[Provium] Missing contract address env vars — all reads will fail:\n  ${missing.join('\n  ')}\nAdd them to dashboard/.env.local`
        if (process.env.NODE_ENV === 'development') {
            console.warn(msg)
        } else {
            console.error(msg)
        }
        return false
    }
    return true
}

// ── LendingProtocol ABI ──────────────────────────────────────────────────
export const LENDING_ABI = [
    {
        inputs: [],
        name: 'getUserCount',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'i', type: 'uint256' }],
        name: 'getUserAtIndex',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'getPosition',
        outputs: [
            { name: 'collateral', type: 'uint256' },
            { name: 'debt', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getTotalCollateral',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getTotalDebt',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'currentPositionRoot',
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'positionRootBlock',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'getHealthFactor',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'target', type: 'address' }],
        name: 'triggerUndercollateralization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'collateral', type: 'uint256' },
        ],
        name: 'Deposit',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
        name: 'Borrow',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'collateral', type: 'uint256' },
        ],
        name: 'ViolationSimulated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, name: 'root', type: 'bytes32' },
            { indexed: false, name: 'blockNum', type: 'uint256' },
        ],
        name: 'PositionRootCommitted',
        type: 'event',
    },
] as const

// ── ComplianceRegistry ABI ───────────────────────────────────────────────
const REPORT_COMPONENTS = [
    { name: 'reportId', type: 'uint256' },
    { name: 'proofType', type: 'uint8' },
    { name: 'trigger', type: 'uint8' },
    { name: 'blockNumber', type: 'uint256' },
    { name: 'proofHash', type: 'bytes32' },
    { name: 'isCompliant', type: 'bool' },
    { name: 'totalCollateral', type: 'uint256' },
    { name: 'totalDebt', type: 'uint256' },
    { name: 'ratioBps', type: 'uint256' },
    { name: 'jurisdiction', type: 'string' },
    { name: 'agentReasoning', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'agentAddress', type: 'address' },
    { name: 'requestId', type: 'uint256' },
] as const

export const REGISTRY_ABI = [
    {
        inputs: [],
        name: 'getLatestReport',
        outputs: [
            { name: '', type: 'tuple', components: REPORT_COMPONENTS },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getAllReports',
        outputs: [
            { name: '', type: 'tuple[]', components: REPORT_COMPONENTS },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { name: 'offset', type: 'uint256' },
            { name: 'limit', type: 'uint256' },
        ],
        name: 'getReports',
        outputs: [
            { name: 'page', type: 'tuple[]', components: REPORT_COMPONENTS },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getReportCount',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'isCurrentlyCompliant',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'reportId', type: 'uint256' },
            { indexed: false, name: 'isCompliant', type: 'bool' },
            { indexed: false, name: 'ratioBps', type: 'uint256' },
            { indexed: false, name: 'agentReasoning', type: 'string' },
        ],
        name: 'ReportSubmitted',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'reportId', type: 'uint256' },
            { indexed: false, name: 'ratioBps', type: 'uint256' },
        ],
        name: 'ViolationRecorded',
        type: 'event',
    },
] as const

// ── RegulatorPortal ABI ──────────────────────────────────────────────────
const REQUEST_COMPONENTS = [
    { name: 'requestId', type: 'uint256' },
    { name: 'requestor', type: 'address' },
    { name: 'proofType', type: 'uint8' },
    { name: 'targetBlock', type: 'uint256' },
    { name: 'jurisdiction', type: 'string' },
    { name: 'requestedAt', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'fulfilled', type: 'bool' },
    { name: 'fulfilledAt', type: 'uint256' },
    { name: 'proofHash', type: 'bytes32' },
    { name: 'agentReasoning', type: 'string' },
] as const

export const PORTAL_ABI = [
    {
        inputs: [],
        name: 'getPendingRequests',
        outputs: [
            { name: '', type: 'tuple[]', components: REQUEST_COMPONENTS },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'requestId', type: 'uint256' }],
        name: 'getRequest',
        outputs: [
            { name: '', type: 'tuple', components: REQUEST_COMPONENTS },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { name: 'proofType', type: 'uint8' },
            { name: 'targetBlock', type: 'uint256' },
            { name: 'jurisdiction', type: 'string' },
        ],
        name: 'requestComplianceProof',
        outputs: [{ name: 'requestId', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'requestId', type: 'uint256' },
            { indexed: true, name: 'requestor', type: 'address' },
            { indexed: false, name: 'jurisdiction', type: 'string' },
        ],
        name: 'ComplianceRequested',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'requestId', type: 'uint256' },
            { indexed: false, name: 'agentReasoning', type: 'string' },
        ],
        name: 'RequestFulfilled',
        type: 'event',
    },
] as const

// Legacy compat export
export const addresses = {
    lendingProtocol: ADDRESSES.LendingProtocol,
    regulatorPortal: ADDRESSES.RegulatorPortal,
    complianceRegistry: ADDRESSES.ComplianceRegistry,
    ultraVerifier: ADDRESSES.UltraVerifier,
}

export const LENDING_PROTOCOL_ABI = LENDING_ABI
export const REGULATOR_PORTAL_ABI = PORTAL_ABI
export const COMPLIANCE_REGISTRY_ABI = REGISTRY_ABI
