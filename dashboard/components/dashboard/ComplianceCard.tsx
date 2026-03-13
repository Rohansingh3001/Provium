// components/dashboard/ComplianceCard.tsx
'use client'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useComplianceStatus } from '@/lib/hooks/useComplianceStatus'
import { formatEther, formatUSDC, formatBlock } from '@/lib/utils'
import { getExplorerBlockUrl } from '@/lib/wagmi'

export function ComplianceCard() {
    const { isCompliant, ratioPct, latestReport, isLoading } = useComplianceStatus()

    return (
        <Card className="h-full">
            <CardHeader>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Collateral Compliance</span>
                {isLoading ? (
                    <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 12 }} />
                ) : (
                    <Badge variant={isCompliant ? 'green' : 'red'}>
                        {isCompliant ? 'COMPLIANT' : 'VIOLATION'}
                    </Badge>
                )}
            </CardHeader>

            <CardBody>
                <div style={{ marginBottom: 24 }}>
                    {isLoading ? (
                        <div className="skeleton" style={{ width: 140, height: 48 }} />
                    ) : (
                        <div
                            style={{
                                fontSize: 'clamp(36px, 4vw, 48px)',
                                fontWeight: 900,
                                color: isCompliant ? '#00C896' : '#FF3B30',
                                lineHeight: 1.1,
                                letterSpacing: '-1.5px',
                            }}
                        >
                            {isCompliant ? 'COMPLIANT' : 'VIOLATION'}
                        </div>
                    )}

                    <div style={{ marginTop: 8 }}>
                        {isLoading ? (
                            <div className="skeleton" style={{ width: 180, height: 72, marginTop: 12 }} />
                        ) : (
                            <div
                                style={{
                                    fontSize: 'clamp(52px, 5vw, 72px)',
                                    fontWeight: 900,
                                    color: '#FF90E8',
                                    letterSpacing: '-3px',
                                    lineHeight: 1,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {ratioPct.toFixed(1)}%
                            </div>
                        )}
                        <div style={{ fontSize: 14, color: '#6B6B6B', marginTop: 4 }}>collateral ratio</div>
                        {/* Ratio bar: 0–200%, marker at 150% */}
                        {!isLoading && (
                            <div style={{ position: 'relative', marginTop: 16 }}>
                                <div className="ratio-bar-track" style={{ position: 'relative' }}>
                                    <div
                                        className="ratio-bar-fill"
                                        style={{
                                            width: `${Math.min(100, (ratioPct / 200) * 100)}%`,
                                            background: isCompliant ? '#00C896' : '#FF3B30',
                                        }}
                                    />
                                    <div
                                        className="ratio-bar-marker"
                                        style={{ left: '75%' }}
                                        title="150% minimum"
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6B6B6B', marginTop: 4 }}>
                                    <span>0%</span>
                                    <span style={{ fontWeight: 700 }}>150% min</span>
                                    <span>200%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ height: 3, background: '#1A1A1A', margin: '28px 0' }} />

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 24,
                    }}
                >
                    {/* Total Collateral */}
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                color: '#6B6B6B',
                                marginBottom: 4,
                            }}
                        >
                            TOTAL COLLATERAL
                        </div>
                        {isLoading ? (
                            <div className="skeleton" style={{ width: 100, height: 24 }} />
                        ) : (
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
                                {formatEther(latestReport?.totalCollateral)} ETH
                            </div>
                        )}
                    </div>

                    {/* Total Debt */}
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                color: '#6B6B6B',
                                marginBottom: 4,
                            }}
                        >
                            TOTAL DEBT
                        </div>
                        {isLoading ? (
                            <div className="skeleton" style={{ width: 120, height: 24 }} />
                        ) : (
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
                                {formatUSDC(latestReport?.totalDebt)} USDC
                            </div>
                        )}
                    </div>

                    {/* Min Required */}
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                color: '#6B6B6B',
                                marginBottom: 4,
                            }}
                        >
                            MIN REQUIRED
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
                            150%
                        </div>
                    </div>

                    {/* Block Number */}
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                color: '#6B6B6B',
                                marginBottom: 4,
                            }}
                        >
                            BLOCK
                        </div>
                        {isLoading ? (
                            <div className="skeleton" style={{ width: 80, height: 24 }} />
                        ) : (
                            <div
                                style={{
                                    fontFamily: 'var(--font-dm-mono)',
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: '#1A1A1A',
                                }}
                            >
                                {formatBlock(latestReport?.blockNumber)}
                            </div>
                        )}
                    </div>
                </div>

                {/* View on Basescan */}
                {latestReport?.blockNumber && (
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F0F0F0' }}>
                        <a
                            href={getExplorerBlockUrl(latestReport.blockNumber)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: 13,
                                color: '#1D4ED8',
                                fontWeight: 500,
                                textDecoration: 'underline',
                            }}
                        >
                            View Block #{(Number(latestReport.blockNumber)).toLocaleString()} on Basescan ↗
                        </a>
                    </div>
                )}
            </CardBody>
        </Card>
    )
}
