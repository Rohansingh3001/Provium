// components/dashboard/ProtocolStatsCard.tsx
'use client'
import { useReadContract } from 'wagmi'
import { ADDRESSES, LENDING_ABI } from '@/lib/contracts'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { formatEther, formatUSDC, formatBlock, truncateHash } from '@/lib/utils'
import { getExplorerTxUrl } from '@/lib/wagmi'

export function ProtocolStatsCard() {
    const { data: userCount, isLoading: loadingUsers } = useReadContract({
        address: ADDRESSES.LendingProtocol,
        abi: LENDING_ABI,
        functionName: 'getUserCount',
        query: { refetchInterval: 30_000 },
    })

    const { data: totalCollateral, isLoading: loadingCollateral } = useReadContract({
        address: ADDRESSES.LendingProtocol,
        abi: LENDING_ABI,
        functionName: 'getTotalCollateral',
        query: { refetchInterval: 30_000 },
    })

    const { data: totalDebt, isLoading: loadingDebt } = useReadContract({
        address: ADDRESSES.LendingProtocol,
        abi: LENDING_ABI,
        functionName: 'getTotalDebt',
        query: { refetchInterval: 30_000 },
    })

    const { data: currentRoot, isLoading: loadingRoot } = useReadContract({
        address: ADDRESSES.LendingProtocol,
        abi: LENDING_ABI,
        functionName: 'currentPositionRoot',
        query: { refetchInterval: 30_000 },
    })

    const { data: rootBlock, isLoading: loadingBlock } = useReadContract({
        address: ADDRESSES.LendingProtocol,
        abi: LENDING_ABI,
        functionName: 'positionRootBlock',
        query: { refetchInterval: 30_000 },
    })

    function StatRow({ label, value, loading, copyTarget }: { label: string; value: React.ReactNode; loading?: boolean; copyTarget?: string }) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 20,
                    borderBottom: '2px solid #E8E8E0',
                    marginBottom: 20,
                }}
            >
                <div style={{ fontSize: 14, color: '#6B6B6B' }}>{label}</div>
                {loading ? (
                    <div className="skeleton" style={{ width: 80, height: 20 }} />
                ) : (
                    <div
                        style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}
                        title={copyTarget}
                    >
                        {value}
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card className="h-full card-accent-pink">
            <CardHeader>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Protocol Stats</span>
            </CardHeader>
            <CardBody>
                <StatRow
                    label="Active Users"
                    value={userCount !== undefined ? String(userCount) : '–'}
                    loading={loadingUsers}
                />
                <StatRow
                    label="Total Collateral"
                    value={totalCollateral ? `${formatEther(totalCollateral)} ETH` : '–'}
                    loading={loadingCollateral}
                />
                <StatRow
                    label="Total Debt"
                    value={totalDebt ? `${formatUSDC(totalDebt)} USDC` : '–'}
                    loading={loadingDebt}
                />
                <StatRow
                    label="Position Root"
                    value={
                        currentRoot ? (
                            <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 12 }}>
                                {truncateHash(currentRoot, 8)}
                            </span>
                        ) : '–'
                    }
                    loading={loadingRoot}
                    copyTarget={currentRoot?.toString()}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#6B6B6B' }}>Root Block</div>
                    {loadingBlock ? (
                        <div className="skeleton" style={{ width: 60, height: 20 }} />
                    ) : (
                        <div
                            style={{
                                fontFamily: 'var(--font-dm-mono)',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#1A1A1A',
                            }}
                        >
                            {formatBlock(rootBlock)}
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    )
}
