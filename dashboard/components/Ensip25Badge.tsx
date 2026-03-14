/**
 * Ensip25Badge.tsx
 *
 * Displays ENSIP-25 AI Agent Registry verification status for an ENS name.
 * ENSIP-25: https://docs.ens.domains/ensip/25/
 *
 * Verification passes when the agent's ENS name has a non-empty text record
 * at key: agent-registration[<erc7930Registry>][<agentId>]
 *
 * This component:
 *  - Shows ✓ VERIFIED (green) or ✗ NOT SET (amber) badge
 *  - Displays the full text record key so operators know what to set
 *  - Explains the verification semantics to dashboard viewers
 */
'use client'

import { useEnsip25Verification } from '@/lib/hooks/useEnsip25Verification'

interface Ensip25BadgeProps {
    /** ENS name to check (e.g. "provium-agent.eth") */
    ensName?: string
    /** Registry contract address (ComplianceRegistry on Base Sepolia) */
    registryAddress: string
    /** Agent ID in the registry (default "1") */
    agentId?: string
    /** Chain ID where registry is deployed (default 84532 = Base Sepolia) */
    registryChainId?: number
    /** If true, show the full raw text record key */
    showKey?: boolean
}

export function Ensip25Badge({
    ensName,
    registryAddress,
    agentId = '1',
    registryChainId = 84532,
    showKey = true,
}: Ensip25BadgeProps) {
    const { verified, rawValue, textKey, isLoading, error } = useEnsip25Verification({
        ensName,
        registryAddress,
        agentId,
        registryChainId,
    })

    const hasName = !!ensName

    return (
        <div style={{
            border: `2px solid ${verified ? '#15803d' : '#92400e'}`,
            borderRadius: 6,
            background: verified ? '#f0fdf4' : '#fffbeb',
            padding: '14px 16px',
            boxShadow: `3px 3px 0 ${verified ? '#15803d' : '#d97706'}`,
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {/* ENSIP-25 label */}
                <span style={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    background: '#1A1A1A',
                    color: '#FFF',
                    padding: '2px 7px',
                    borderRadius: 3,
                    flexShrink: 0,
                }}>
                    ENSIP-25
                </span>

                {/* Status badge */}
                {isLoading ? (
                    <span style={{ fontSize: 12, color: '#6B6B6B' }}>Resolving…</span>
                ) : !hasName ? (
                    <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#92400e',
                        background: '#fef3c7',
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid #d97706',
                    }}>
                        ✗  ENS name not set
                    </span>
                ) : verified ? (
                    <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid #15803d',
                    }}>
                        ✓  Agent verified
                    </span>
                ) : (
                    <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#92400e',
                        background: '#fef3c7',
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid #d97706',
                    }}>
                        ✗  Text record not set
                    </span>
                )}

                {/* Value indicator */}
                {verified && rawValue && (
                    <span style={{ fontSize: 11, color: '#166534', fontFamily: 'var(--font-dm-mono)' }}>
                        value=&quot;{rawValue}&quot;
                    </span>
                )}
            </div>

            {/* Description */}
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#4A4A4A', lineHeight: 1.6 }}>
                ENSIP-25 ties this agent&apos;s ENS name to its on-chain registry entry in
                ComplianceRegistry. Any protocol can verify the agent is legitimate with
                a single ENS resolver lookup — no third-party trust required.
            </p>

            {/* Text record key */}
            {showKey && textKey && (
                <div style={{
                    background: '#1A1A1A',
                    borderRadius: 4,
                    padding: '8px 12px',
                    marginTop: 6,
                }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Text record to set on {ensName || 'your-agent.eth'}
                    </div>
                    <div style={{
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 10,
                        color: verified ? '#86efac' : '#FCD34D',
                        wordBreak: 'break-all',
                        lineHeight: 1.7,
                    }}>
                        <span style={{ color: '#9CA3AF' }}>key: </span>
                        {textKey}
                    </div>
                    <div style={{
                        fontFamily: 'var(--font-dm-mono)',
                        fontSize: 10,
                        color: '#86efac',
                        marginTop: 2,
                    }}>
                        <span style={{ color: '#9CA3AF' }}>value: </span>1
                    </div>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 8 }}>
                    Resolver error: {error.message}
                </div>
            )}

            {/* Setup hint when not verified */}
            {hasName && !isLoading && !verified && !error && (
                <div style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: '#78350f',
                    lineHeight: 1.6,
                }}>
                    Set the text record above on <strong>{ensName}</strong> via{' '}
                    <a
                        href={`https://app.ens.domains/name/${ensName}/details`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#d97706', textDecoration: 'underline' }}
                    >
                        app.ens.domains
                    </a>{' '}
                    to enable ENSIP-25 verification.
                </div>
            )}
        </div>
    )
}
