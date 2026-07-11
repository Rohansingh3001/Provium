// app/dashboard/docs/page.tsx
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, LayoutDashboard, FileCheck, Scale, AlertTriangle, Zap, Shield, Eye, BookOpen } from 'lucide-react'

type FAQItem = {
    q: string
    a: string | React.ReactNode
}

function Accordion({ items }: { items: FAQItem[] }) {
    const [open, setOpen] = useState<number | null>(null)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
                <div
                    key={i}
                    style={{
                        border: '2px solid #1A1A1A',
                        borderRadius: 6,
                        overflow: 'hidden',
                        boxShadow: open === i ? '4px 4px 0 #FFE500' : '3px 3px 0 #1A1A1A',
                        transition: 'box-shadow 0.15s ease',
                    }}
                >
                    <button
                        onClick={() => setOpen(open === i ? null : i)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            background: open === i ? '#FFE500' : '#FFFBF0',
                            border: 'none',
                            borderBottom: open === i ? '2px solid #1A1A1A' : 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            gap: 12,
                        }}
                    >
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.4 }}>
                            {item.q}
                        </span>
                        {open === i
                            ? <ChevronDown size={18} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                            : <ChevronRight size={18} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                        }
                    </button>
                    {open === i && (
                        <div style={{
                            padding: '16px 18px',
                            background: 'white',
                            fontSize: 14,
                            color: '#3A3A3A',
                            lineHeight: 1.7,
                        }}>
                            {item.a}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

function SectionTitle({ icon: Icon, label, color = '#1A1A1A' }: { icon: any, label: string, color?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
                width: 36, height: 36,
                background: color,
                border: '2px solid #1A1A1A',
                borderRadius: 6,
                boxShadow: '3px 3px 0 #1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon size={18} strokeWidth={2.5} color={color === '#1A1A1A' ? '#FFE500' : 'white'} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', margin: 0, letterSpacing: '-0.3px' }}>
                {label}
            </h2>
        </div>
    )
}

function StepCard({ number, title, description }: { number: number, title: string, description: string | React.ReactNode }) {
    return (
        <div style={{
            display: 'flex', gap: 16,
            padding: '16px 20px',
            background: 'white',
            border: '2px solid #1A1A1A',
            borderRadius: 6,
            boxShadow: '4px 4px 0 #1A1A1A',
        }}>
            <div style={{
                width: 36, height: 36,
                background: '#FFE500',
                border: '2px solid #1A1A1A',
                borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 16, color: '#1A1A1A',
                flexShrink: 0,
            }}>
                {number}
            </div>
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#5A5A5A', lineHeight: 1.6 }}>{description}</div>
            </div>
        </div>
    )
}

function HighlightBox({ children, color = '#FFE500' }: { children: React.ReactNode, color?: string }) {
    return (
        <div style={{
            background: color === '#FFE500' ? '#FFFDE7' : '#F0FFF8',
            border: `2px solid ${color}`,
            borderLeft: `5px solid ${color}`,
            borderRadius: 4,
            padding: '12px 16px',
            fontSize: 13,
            color: '#1A1A1A',
            lineHeight: 1.6,
            marginTop: 8,
        }}>
            {children}
        </div>
    )
}

export default function DocsPage() {
    return (
        <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 40 }}>

            {/* Header */}
            <div>
                <div className="dash-section-label" style={{ marginBottom: 10 }}>Help & Documentation</div>
                <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1A1A1A', margin: '0 0 12px', letterSpacing: '-1px' }}>
                    How to use Provium
                </h1>
                <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
                    Provium is an autonomous DeFi compliance system. This guide explains every section of the dashboard and answers common questions — no code required.
                </p>
            </div>

            {/* What is Provium */}
            <div>
                <SectionTitle icon={Shield} label="What is Provium?" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                        padding: '20px 24px',
                        background: '#1A1A1A',
                        border: '3px solid #1A1A1A',
                        borderRadius: 8,
                        boxShadow: '6px 6px 0 #FFE500',
                        color: 'white',
                        fontSize: 15,
                        lineHeight: 1.7,
                    }}>
                        Provium uses AI agents to automatically monitor a DeFi lending protocol and
                        generate <strong style={{ color: '#FFE500' }}>zero-knowledge compliance proofs</strong> — mathematical certificates that prove
                        all borrowers are properly collateralized, without revealing anyone's individual
                        position or wallet balance.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }} className="docs-3col">
                        {[
                            { icon: Eye, label: 'Privacy', text: 'Individual positions are never exposed. Only the aggregate proof is public.' },
                            { icon: Zap, label: 'Autonomous', text: 'The AI agent runs every 60 seconds by default with no human intervention needed.' },
                            { icon: Shield, label: 'Verifiable', text: 'Every proof is stored on Base Sepolia forever. Anyone can verify it.' },
                        ].map(({ icon: Icon, label, text }) => (
                            <div key={label} style={{
                                padding: '16px',
                                background: '#FFFBF0',
                                border: '2px solid #1A1A1A',
                                borderRadius: 6,
                                boxShadow: '3px 3px 0 #1A1A1A',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Icon size={16} strokeWidth={2.5} />
                                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 13, color: '#5A5A5A', lineHeight: 1.5 }}>{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overview page guide */}
            <div>
                <SectionTitle icon={LayoutDashboard} label="Overview Page" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <StepCard
                        number={1}
                        title="Agent Status card"
                        description={<>Shows whether the AI agent is currently <strong>ACTIVE</strong>, <strong>PAUSED</strong>, or <strong>AWAITING FIRST PROOF</strong>. Active means a proof was submitted in the last 10 minutes. It also shows the agent's wallet address — you can click it to verify activity on Basescan.</>}
                    />
                    <StepCard
                        number={2}
                        title="Compliance Score"
                        description="Shows the live collateral ratio of the entire protocol (total collateral ÷ total debt). The protocol minimum is 150% (set in LendingProtocol.sol). Green means compliant, red means violation. The bar updates every 30 seconds from on-chain data."
                    />
                    <StepCard
                        number={3}
                        title="Protocol Stats"
                        description="Total WETH deposited, total USDC borrowed, and number of active positions — all live from the LendingProtocol contract on Base Sepolia."
                    />
                    <StepCard
                        number={4}
                        title="Agent Activity feed"
                        description="A real-time log of proofs the agent has submitted. Each entry shows the trigger type (routine / urgent / regulator), the block number, whether it was compliant, and a link to the transaction on Basescan."
                    />
                </div>
            </div>

            {/* Proof History */}
            <div>
                <SectionTitle icon={FileCheck} label="Proof History Page" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <StepCard
                        number={1}
                        title="Browse all proofs"
                        description="Every compliance proof the agent has ever generated is listed here, newest first. Each row shows the proof ID, block number, compliance status, collateral ratio, trigger type, and transaction hash."
                    />
                    <StepCard
                        number={2}
                        title="Filter by type"
                        description={<>Use the filter buttons — <strong>All</strong>, <strong>Routine</strong>, <strong>Violations</strong>, or <strong>Regulator</strong> — to narrow down the list. Violations are proofs where the protocol was undercollateralized.</>}
                    />
                    <StepCard
                        number={3}
                        title="Read the AI reasoning"
                        description={`Click the "REASONING" button on any row to expand the AI agent's written justification for that proof. This text is stored permanently on-chain — it cannot be edited or deleted after submission.`}
                    />
                    <StepCard
                        number={4}
                        title="Verify on Basescan"
                        description="Every transaction hash links directly to Base Sepolia explorer so you can independently verify the proof was submitted and what data it contains."
                    />
                    <HighlightBox color="#FFE500">
                        <strong>Why is the table empty?</strong> The table only shows proofs that have been submitted on-chain. If it's empty, the agent hasn't run yet. There are no dummy entries — everything is real on-chain data.
                    </HighlightBox>
                </div>
            </div>

            {/* Regulator Portal */}
            <div>
                <SectionTitle icon={Scale} label="Regulator Portal" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <StepCard
                        number={1}
                        title="Connect your wallet"
                        description='Click "Connect Wallet" in the top right. You need a wallet (MetaMask, Coinbase Wallet, etc.) connected to Base Sepolia testnet. You need a small amount of test ETH to submit a request.'
                    />
                    <StepCard
                        number={2}
                        title="Fill the request form"
                        description={<>Choose a <strong>Proof Type</strong> (Collateral Ratio), enter a <strong>Target Block</strong> (leave blank to use the current block), and select a <strong>Jurisdiction</strong> (e.g. US-GENIUS-ACT). Then click <strong>Submit Request</strong>.</>}
                    />
                    <StepCard
                        number={3}
                        title="Wait for fulfillment"
                        description="Your request is written on-chain with a 30-minute deadline. The AI agent picks it up on its next cycle (up to 60 seconds) and generates a proof specifically for your request. The proof appears in Proof History linked to your request ID."
                    />
                    <StepCard
                        number={4}
                        title="View pending requests"
                        description="The bottom of the page shows all open requests that haven't been fulfilled yet — including yours. Once fulfilled, the request disappears from the pending list and appears in Proof History."
                    />
                    <HighlightBox color="#00C896">
                        <strong>You don't need to be a regulator to try this.</strong> Anyone can submit a compliance request. The AI agent will fulfill it and you can see what a regulator-triggered proof looks like.
                    </HighlightBox>
                </div>
            </div>

            {/* Simulate */}
            <div>
                <SectionTitle icon={AlertTriangle} label="Simulate Violation Page" color="#FF3B30" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <StepCard
                        number={1}
                        title="Connect your wallet"
                        description="You must connect a wallet to trigger a violation. The transaction is sent from your connected wallet. You need Base Sepolia test ETH."
                    />
                    <StepCard
                        number={2}
                        title="Choose a target address (optional)"
                        description="Leave the address field blank to use the default seeded test user. Or paste any wallet address that has an active position in the protocol. The violation is applied to that user's collateral on-chain."
                    />
                    <StepCard
                        number={3}
                        title="Click TRIGGER VIOLATION"
                        description="This sends a transaction to the LendingProtocol contract that drops the target user's collateral below 140%. This simulates what would happen if a position became undercollateralized in a real protocol."
                    />
                    <StepCard
                        number={4}
                        title="Watch the agent respond"
                        description='Go to Overview → Agent Activity. Within about 60 seconds the agent detects the health factor drop, generates an URGENT or CRITICAL proof, and submits it. The proof appears in Proof History with "isCompliant: false" and a red VIOLATION badge.'
                    />
                    <HighlightBox color="#FF3B30">
                        <strong>This is testnet only.</strong> You are triggering a violation on a test protocol. No real funds are involved. The violation is permanent on-chain but only affects Base Sepolia testnet data.
                    </HighlightBox>
                </div>
            </div>

            {/* FAQ */}
            <div>
                <SectionTitle icon={BookOpen} label="Frequently Asked Questions" />
                <Accordion items={[
                    {
                        q: "What is a zero-knowledge proof and why does it matter?",
                        a: "A zero-knowledge proof is a piece of cryptographic math that proves a statement is true without revealing the underlying data. Here, it proves \"all users are above 150% collateral\" without showing how much any individual has deposited or borrowed. Regulators get certainty, users get privacy.",
                    },
                    {
                        q: "Why can't I see individual user positions?",
                        a: "By design. Provium uses a Merkle tree to hide individual positions. The ZK circuit only proves the aggregate result. This is the core privacy guarantee — not a limitation.",
                    },
                    {
                        q: "What does \"collateral ratio\" mean?",
                        a: "It's the ratio of total collateral (WETH deposited) to total debt (USDC borrowed), expressed as a percentage. 150% means for every $100 borrowed, there is $150 in collateral backing it. This demo protocol enforces a 150% minimum — below that is a violation.",
                    },
                    {
                        q: "Agent Status shows PAUSED — is something broken?",
                        a: "PAUSED means no proof has been submitted in the last 10 minutes. This usually means the agent isn't currently running. The agent needs to be started by the protocol operator. The dashboard itself always reflects live on-chain data.",
                    },
                    {
                        q: "What is Base Sepolia?",
                        a: "Base Sepolia is a test network (testnet) built on top of Base (Coinbase's L2 on Ethereum). It uses test ETH with no real value. Provium is deployed here for demonstration. To interact, add Base Sepolia to your wallet and get free test ETH from the Alchemy faucet.",
                    },
                    {
                        q: "How do I add Base Sepolia to MetaMask?",
                        a: <div>
                            <p style={{ margin: '0 0 8px' }}>Open MetaMask → Networks → Add Network → Add it manually:</p>
                            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 12, background: '#F5F5F0', border: '1px solid #DDD', borderRadius: 4, padding: '10px 14px', lineHeight: 2 }}>
                                Network Name: Base Sepolia<br />
                                RPC URL: https://sepolia.base.org<br />
                                Chain ID: 84532<br />
                                Currency Symbol: ETH<br />
                                Explorer: https://sepolia.basescan.org
                            </div>
                        </div>
                    },
                    {
                        q: "My regulator request has been pending for more than 30 minutes — what happened?",
                        a: "Each request has a 30-minute deadline (set in RegulatorPortal.sol). If the agent didn't run before the deadline expired, the request is marked expired and will not be fulfilled. Submit a new request. Once submitted, the agent typically fulfills it within one 60-second epoch if it is running.",
                    },
                    {
                        q: "Can I verify a proof myself?",
                        a: "Yes. Every proof transaction is on Basescan. The proof hash, public inputs, and the agent's reasoning text are all stored in the ComplianceRegistry contract. You can call getAllReports() on the contract directly to read every proof ever submitted.",
                    },
                    {
                        q: "Is the on-chain AI reasoning editable after submission?",
                        a: "No. Once a proof is submitted to ComplianceRegistry, the agentReasoning string is part of an immutable blockchain record. It cannot be changed, deleted, or censored by anyone — including the protocol operators.",
                    },
                    {
                        q: "What wallets are supported?",
                        a: "MetaMask, Coinbase Wallet, WalletConnect (any WalletConnect-compatible wallet), and Rainbow Wallet. Connect via the button in the top-right corner of the dashboard.",
                    },
                    {
                        q: "Does connecting my wallet cost anything?",
                        a: "Connecting your wallet is free. You only spend test ETH when you submit a regulator request or trigger a violation — both are on-chain transactions. Test ETH is free from the Base Sepolia faucet.",
                    },
                ]} />
            </div>

            {/* Responsive grid CSS */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 720px) {
                    .docs-3col { grid-template-columns: 1fr !important; }
                }
            ` }} />
        </div>
    )
}
