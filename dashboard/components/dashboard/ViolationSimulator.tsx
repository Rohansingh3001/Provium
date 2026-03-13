// components/dashboard/ViolationSimulator.tsx
'use client'
import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ADDRESSES, LENDING_ABI, REGISTRY_ABI } from '@/lib/contracts'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, TrendingDown, EyeOff, Bot } from 'lucide-react'
import type { SimulationState } from '@/lib/types'

export function ViolationSimulator() {
    const account = useAccount()
    const [targetUserText, setTargetUserText] = useState('')
    const [step, setStep] = useState<SimulationState>('idle')
    const [simTxHash, setSimTxHash] = useState('')
    const [error, setError] = useState<Error | null>(null)

    // 1. Fetch user 0 as a default test address
    const { data: user0, isLoading: loadingDeft } = useReadContract({
        address: ADDRESSES.LendingProtocol,
        abi: LENDING_ABI,
        functionName: 'getUserAtIndex',
        args: [0n],
    })

    // Set default once user 0 is loaded
    const defaultTarget =
        typeof user0 === 'string'
            ? user0
            : '0x0000000000000000000000000000000000000000'

    const { writeContractAsync, isPending } = useWriteContract()

    // 2. Trigger Violation
    async function triggerViolation() {
        if (!account.isConnected) return
        setError(null)
        setStep('triggered')
        try {
            const target = (targetUserText || defaultTarget) as `0x${string}`
            const hash = await writeContractAsync({
                address: ADDRESSES.LendingProtocol,
                abi: LENDING_ABI,
                functionName: 'triggerUndercollateralization',
                args: [target],
            })
            setSimTxHash(hash)
            // Agent is triggered automatically here, we just visually walk through steps
            setTimeout(() => setStep('detecting'), 3000)
        } catch (e) {
            setError(e as Error)
            setStep('idle')
        }
    }

    // 3. Watch for the agent's response to move the state visually
    useWatchContractEvent({
        address: ADDRESSES.ComplianceRegistry,
        abi: REGISTRY_ABI,
        eventName: 'ViolationRecorded',
        onLogs() {
            if (step === 'detecting' || step === 'triggered') {
                setStep('proven')
                setTimeout(() => setStep('recorded'), 2000)
                setTimeout(() => setStep('idle'), 8000) // Reset after showing success
            }
        },
    })

    return (
        <Card className="max-w-3xl">
            <CardHeader>
                <span style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle color="#FF3B30" size={18} /> Forced Liquidation Event
                </span>
            </CardHeader>

            <CardBody>
                <p style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.6, marginBottom: 24 }}>
                    This simulator artificially flashes a user&apos;s collateral value to zero in the target smart contract.
                    Observe how the autonomous Watcher agent detects the dropped ratio, triggers an immediate out-of-band proof,
                    and writes the violation on-chain in under 60 seconds — without exposing the user&apos;s identity to regulators.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
                    {/* Left Column: Form */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6B6B6B' }}>
                                TARGET USER ADDRESS
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1A1A', background: '#FFE500', border: '1px solid #1A1A1A', borderRadius: 3, padding: '1px 6px', letterSpacing: '0.5px' }}>
                                OPTIONAL
                            </span>
                        </div>
                        <input
                            className="input-base"
                            style={{ width: '100%', marginBottom: 4, fontFamily: 'var(--font-dm-mono)', fontSize: 13 }}
                            placeholder={`Default: ${defaultTarget.slice(0, 10)}...`}
                            value={targetUserText}
                            onChange={(e) => setTargetUserText(e.target.value)}
                            disabled={step !== 'idle' || isPending}
                        />
                        <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 12 }}>
                            Leave blank to use the seeded test address
                        </div>

                        {!account.isConnected ? (
                            <ConnectButton.Custom>
                                {({ openConnectModal }) => (
                                    <Button variant="black" className="w-full justify-center" onClick={openConnectModal}>
                                        Connect Wallet to Attack
                                    </Button>
                                )}
                            </ConnectButton.Custom>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full justify-center"
                                style={{
                                    background: step === 'idle' ? '#FFEFEE' : 'inherit',
                                    borderColor: step === 'idle' ? '#FF3B30' : '#EBEBEB',
                                    color: step === 'idle' ? '#FF3B30' : '#6B6B6B',
                                }}
                                disabled={step !== 'idle' || isPending || loadingDeft}
                                isLoading={isPending}
                                onClick={triggerViolation}
                            >
                                {isPending ? 'Executing flash attack...' : 'Trigger Value Flash'}
                            </Button>
                        )}

                        {error && (
                            <div style={{ marginTop: 12, fontSize: 12, color: '#DC2626', lineHeight: 1.4 }}>
                                Attack failed: {error.message.split('\n')[0]}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Execution Flow */}
                    <div
                        style={{
                            background: '#1A1A1A',
                            borderRadius: 8,
                            padding: 20,
                            color: 'white',
                            position: 'relative',
                        }}
                    >
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6B6B6B', marginBottom: 16 }}>
                            ATTACK VECTOR STATUS
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 12, opacity: step !== 'idle' ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                                <TrendingDown color={step !== 'idle' ? '#EF4444' : '#6B6B6B'} size={18} />
                                <div style={{ fontSize: 13, fontFamily: 'var(--font-dm-mono)' }}>Collateral flashed to zero</div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, opacity: step === 'detecting' || step === 'proven' || step === 'recorded' ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                                <EyeOff color={step === 'detecting' || step === 'proven' || step === 'recorded' ? '#60A5FA' : '#6B6B6B'} size={18} />
                                <div style={{ fontSize: 13, fontFamily: 'var(--font-dm-mono)' }}>Watcher detects ratio drop</div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, opacity: step === 'proven' || step === 'recorded' ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                                <Bot color={step === 'proven' || step === 'recorded' ? '#C084FC' : '#6B6B6B'} size={18} />
                                <div style={{ fontSize: 13, fontFamily: 'var(--font-dm-mono)' }}>Noir proof generated</div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, opacity: step === 'recorded' ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                                <AlertTriangle color={step === 'recorded' ? '#10B981' : '#6B6B6B'} size={18} />
                                <div style={{ fontSize: 13, fontFamily: 'var(--font-dm-mono)' }}>Violation logged on-chain</div>
                            </div>
                        </div>

                        {(step === 'detecting' || step === 'proven') && (
                            <div style={{ position: 'absolute', top: 20, right: 20 }}>
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: 10, color: '#6B6B6B', fontFamily: 'var(--font-dm-mono)' }}>Agent working</span>
                                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                </div>
                            </div>
                        )}

                        {step === 'recorded' && (
                            <div style={{ position: 'absolute', top: 20, right: 20 }}>
                                <span style={{ fontSize: 10, color: '#10B981', fontWeight: 800 }}>✓ COMPLETED</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
