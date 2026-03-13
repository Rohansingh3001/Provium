// components/dashboard/RegulatorForm.tsx
'use client'
import { useState } from 'react'
import { useRegulatorRequests } from '@/lib/hooks/useRegulatorRequests'
import { useAccount, useBlockNumber } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { truncateHash } from '@/lib/utils'
import { getExplorerTxUrl } from '@/lib/wagmi'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { EnsAddress } from '@/components/EnsAddress'

export function RegulatorForm() {
    const account = useAccount()
    const { data: currentBlock } = useBlockNumber({ watch: true })

    const { submitRequest, isSubmitting, submitTxHash, isSuccess, error } = useRegulatorRequests()

    const [proofType, setProofType] = useState(0) // 0 = Collateral Ratio
    const [targetBlock, setTargetBlock] = useState('')
    const [jurisdiction, setJurisdiction] = useState('US-GENIUS-ACT')

    const JURISDICTIONS = ['US-GENIUS-ACT', 'EU-MiCA', 'FATF', 'OTHER']

    async function handleSubmit() {
        if (!account.isConnected) return
        const blockNum = targetBlock ? BigInt(targetBlock) : 0n
        await submitRequest(proofType, blockNum, jurisdiction)
    }

    return (
        <Card className="h-full border-3 border-black shadow-[4px_4px_0_#1A1A1A]">
            <CardHeader>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Submit Compliance Request</span>
            </CardHeader>

            <CardBody>
                <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24, lineHeight: 1.6 }}>
                    Submit an on-chain compliance request to the Provium agent. The agent
                    will automatically detect your request and fulfill it within ~60 seconds
                    by generating a real ZK proof and storing plain-English reasoning on Base Sepolia.
                </p>

                {/* Identity Banner */}
                {account.isConnected && (
                    <div
                        style={{
                            border: '2px solid #1A1A1A',
                            background: '#F5F5F0',
                            padding: '12px 16px',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
                        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, color: '#6B6B6B', textTransform: 'uppercase' }}>
                            Connected as
                        </span>
                        <EnsAddress
                            address={account.address}
                            className="font-mono text-zkblack font-bold text-[13px]"
                        />
                        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: '#6B6B6B', marginLeft: 'auto' }}>
                            Mainnet ENS verified
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {/* FIELD 1 */}
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                color: '#6B6B6B',
                                marginBottom: 8,
                            }}
                        >
                            PROOF TYPE
                        </div>
                        <button
                            onClick={() => setProofType(0)}
                            style={{
                                background: proofType === 0 ? '#1A1A1A' : 'white',
                                color: proofType === 0 ? 'white' : '#1A1A1A',
                                border: '2px solid #1A1A1A',
                                padding: '10px 16px',
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                width: '100%',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            Collateral Ratio (150% minimum)
                            {proofType === 0 && <CheckCircle2 size={16} color="#FF90E8" />}
                        </button>
                    </div>

                    {/* FIELD 2 */}
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                color: '#6B6B6B',
                                marginBottom: 8,
                            }}
                        >
                            TARGET BLOCK
                        </div>
                        <input
                            type="number"
                            className="input-base"
                            placeholder="Leave blank for latest block..."
                            value={targetBlock}
                            onChange={(e) => setTargetBlock(e.target.value)}
                        />
                        {currentBlock && (
                            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, color: '#6B6B6B', marginTop: 6 }}>
                                Current chain block: #{currentBlock.toString()}
                            </div>
                        )}
                    </div>

                    {/* FIELD 3 */}
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                color: '#6B6B6B',
                                marginBottom: 8,
                            }}
                        >
                            JURISDICTION
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {JURISDICTIONS.map((j) => (
                                <button
                                    key={j}
                                    onClick={() => setJurisdiction(j)}
                                    style={{
                                        background: jurisdiction === j ? '#1A1A1A' : 'white',
                                        color: jurisdiction === j ? 'white' : '#1A1A1A',
                                        border: '2px solid #1A1A1A',
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (jurisdiction !== j) (e.target as HTMLButtonElement).style.background = '#F5F5F0'
                                    }}
                                    onMouseLeave={(e) => {
                                        if (jurisdiction !== j) (e.target as HTMLButtonElement).style.background = 'white'
                                    }}
                                >
                                    {j}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div style={{ marginTop: 32 }}>
                    {!account.isConnected ? (
                        <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                                <Button
                                    variant="black"
                                    className="w-full justify-center"
                                    size="lg"
                                    onClick={openConnectModal}
                                >
                                    Connect Wallet to Request
                                </Button>
                            )}
                        </ConnectButton.Custom>
                    ) : (
                        <Button
                            variant="pink"
                            className="w-full justify-center"
                            size="lg"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            onClick={handleSubmit}
                        >
                            {isSubmitting ? 'Sending transaction...' : 'Submit On-Chain →'}
                        </Button>
                    )}
                </div>

                {/* Feedback banners */}
                {error && (
                    <div style={{ marginTop: 16, background: '#FEE2E2', border: '2px solid #DC2626', borderRadius: 6, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <AlertCircle color="#DC2626" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: 13, color: '#991B1B', fontWeight: 500, lineHeight: 1.5 }}>
                            Submission failed: {error.message.split('\n')[0]}
                        </div>
                    </div>
                )}

                {isSuccess && submitTxHash && (
                    <div style={{ marginTop: 16, background: '#D1FAE5', border: '2px solid #059669', borderRadius: 6, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <CheckCircle2 color="#059669" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <div style={{ fontSize: 13, color: '#064E3B', fontWeight: 700, marginBottom: 4 }}>
                                Request submitted on-chain.
                            </div>
                            <div style={{ fontSize: 13, color: '#065F46', lineHeight: 1.5 }}>
                                The agent will automatically fulfill it in ~60 seconds.{' '}
                                <a
                                    href={getExplorerTxUrl(submitTxHash)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#059669', textDecoration: 'underline', fontFamily: 'var(--font-dm-mono)' }}
                                >
                                    tx {truncateHash(submitTxHash, 4)} ↗
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    )
}
