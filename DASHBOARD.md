# Dashboard Module — `dashboard/`

Next.js 14 App Router frontend. Real-time compliance monitoring with live on-chain event subscriptions, a public regulator portal, and a violation simulator.

---

## Directory Layout

```
dashboard/
├── app/
│   ├── layout.tsx          # Root layout — fonts, providers, global CSS
│   ├── page.tsx            # Landing page (assembles landing/* components)
│   ├── providers.tsx       # WagmiProvider + TanStackQueryProvider (client boundary)
│   │
│   └── dashboard/
│       ├── layout.tsx      # Dashboard shell: Sidebar + TopBar
│       ├── page.tsx        # Redirect: /dashboard → /dashboard/overview
│       ├── overview/       # Main compliance dashboard
│       ├── proofs/         # Full proof history table
│       ├── regulator/      # Regulator request submission portal
│       ├── simulate/       # Violation simulator (demo)
│       └── docs/           # In-app documentation
│
├── components/
│   ├── landing/            # Landing page sections (11 components)
│   ├── dashboard/          # Dashboard-specific components (10 components)
│   └── ui/                 # Shared primitives (Button, Badge, etc.)
│
├── lib/
│   ├── contracts.ts        # ABI + contract addresses (reads deployments JSON)
│   ├── wagmi.ts            # Wagmi config — Base Sepolia chain
│   ├── store.ts            # Zustand stores (notifications, panel, sidebar)
│   ├── query-keys.ts       # TanStack Query key factory
│   ├── types.ts            # TypeScript types for ComplianceReport, etc.
│   ├── utils.ts            # Formatting helpers (ratio %, time ago, address truncate)
│   └── hooks/              # Custom React hooks
│       ├── useComplianceStatus.ts   # All reports, latest report, report count
│       ├── useProofHistory.ts       # Paginated proof history
│       ├── useRegulatorRequests.ts  # Pending + fulfilled requests
│       └── useAgentFeed.ts          # Simulated real-time agent log feed
│
├── app/globals.css         # All CSS (design tokens, animations, components)
└── .env.local              # Contract addresses + RPC URL
```

---

## Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 App Router | Server components, route-level loading states |
| Styling | Vanilla CSS (`globals.css`) | Full control, no utility class bloat |
| Web3 | Wagmi v2 + viem | Type-safe contract reads, `useWatchContractEvent` for real-time |
| Server state | TanStack Query (via Wagmi) | `staleTime: 30s`, `gcTime: 5min`, exponential retry |
| Client state | Zustand (3 stores) | Notification badges, panel state, sidebar collapse |
| Toasts | Sonner | Wired to on-chain events |
| Fonts | Google Fonts: DM Sans + DM Mono | Clean, technical |

---

## App Pages

### `/` — Landing Page

Assembled from `components/landing/`:

| Component | What it shows |
|-----------|--------------|
| `Navbar` | Logo, nav links, CTA button |
| `Hero` | Headline + live agent log card (static demo) |
| `StatsBar` | 4 key metrics (ShapeShift fine, 150% ratio, 60s, 0 users exposed) |
| `ProblemSection` | 3 stat cards explaining the compliance crisis |
| `FTXSection` | Dark "Tornado Cash · BitMEX · ShapeShift — all fined. None had ZK." |
| `AgentShowcase` | Three agent cards + live terminal simulation |
| `HowItWorks` | 4-step flow: Watch → Analyze → Prove → Deliver |
| `RegulatorPreview` | Fulfilled request card with AI reasoning box |
| `FinalCTA` | Closing call-to-action |
| `Footer` | Links + built-at credit |

### `/dashboard/overview` — Main Dashboard

Assembled from `components/dashboard/`:

| Component | Data source | Description |
|-----------|------------|-------------|
| `ComplianceCard` | `useComplianceStatus` | Current compliance status, ratio, latest proof |
| `ProtocolStatsCard` | `useComplianceStatus` | Total users, collateral, debt, report count |
| `AgentStatusCard` | `useComplianceStatus` | Agent epoch timing, last proof age |
| `AgentBrainFeed` | `useAgentFeed` | Simulated real-time agent log (3 rotating messages) |
| `ProofTable` (last 5) | `useComplianceStatus` | Latest proofs with compliance pill |

### `/dashboard/proofs` — Proof History

Full reverse-chronological table of every `ComplianceReport` ever stored on-chain. Click any row to open the AI reasoning side-panel. Notification badge on the sidebar item shows how many new proofs since the user's last visit.

### `/dashboard/regulator` — Regulator Portal

`RegulatorForm` + `RequestList`. Allows any address to submit an on-chain `ComplianceRequest` via `RegulatorPortal.submitRequest()`. The `RequestList` shows pending and fulfilled requests with their proof hashes and AI reasoning.

### `/dashboard/simulate` — Violation Simulator

`ViolationSimulator`. Two buttons: "Trigger Undercollateralization" (calls `LendingProtocol.triggerUndercollateralization()`) and "Restore Compliance". Used during demo to show real-time violation detection and recording.

---

## Real-Time Events — `useWatchContractEvent`

The dashboard subscribes to `ComplianceRegistry.ReportSubmitted` via Wagmi's `useWatchContractEvent`. When a new proof lands on-chain:

1. **Toast fires** (Sonner, bottom-right) — `"Proof #N submitted — 163.0% ✓"` (green) or `"VIOLATION proof #N — ratio 138.5% below minimum."` (red)
2. **TanStack Query cache invalidated** — proof table refreshes without user action
3. **Notification badge increments** — via `useNotificationStore.setCurrentCount()`

No polling required. The event subscription is a WebSocket connection to Base Sepolia.

---

## State Management — `lib/store.ts`

Three scoped Zustand stores. No Redux. No Context nesting.

### `useNotificationStore`
Tracks unread proofs for the sidebar badge.
```ts
lastSeenReportCount  // persisted to localStorage
currentReportCount   // live, from useComplianceStatus
newProofCount()      // computed: current - lastSeen
markSeen()           // called when user visits /dashboard/proofs
setCurrentCount(n)   // called by useComplianceStatus on each poll
```

### `usePanelStore`
Controls the AI reasoning side-panel in the proof table.
```ts
activePanelProofId: number | null
openPanel(id)
closePanel()
```

### `useSidebarStore`
Mobile sidebar collapse.
```ts
isCollapsed: boolean
toggle() / collapse() / expand()
```

---

## Data Layer — `lib/hooks/`

All hooks use Wagmi's `useReadContract` with TanStack Query under the hood.

### `useComplianceStatus`
The most-used hook. Reads:
- `ComplianceRegistry.getAllReports()` — full array of all reports
- `ComplianceRegistry.isCurrentlyCompliant()` — latest compliance bool
- `ComplianceRegistry.getReportCount()`
- `LendingProtocol.getAllActivePositions()`

Config: `staleTime: 30_000`, `gcTime: 300_000`, `retry: 3` with exponential backoff. 30s matches one Base Sepolia block epoch — data is never unnecessarily stale.

### `useProofHistory`
Thin wrapper over `useComplianceStatus` that returns reports sorted newest-first.

### `useRegulatorRequests`
Reads `RegulatorPortal.getPendingRequests()` and `RegulatorPortal.getAllRequests()`. Splits into pending vs fulfilled arrays.

### `useAgentFeed`
Stateful hook that simulates a live agent terminal using `setInterval`. Cycles through realistic agent log messages using the last known on-chain report as context. Not connected to actual agent stdout — that would require a WebSocket server.

---

## Query Key Factory — `lib/query-keys.ts`

Centralised string factory prevents magic string typos and makes cache invalidation type-safe:

```ts
queryKeys.compliance.allReports()  // → ['compliance', 'allReports']
queryKeys.lending.position(addr)   // → ['lending', 'position', '0x...']
```

Used in hooks for `queryKey` and in event handlers for `queryClient.invalidateQueries()`.

---

## CSS Architecture — `app/globals.css`

Single file, ~600 lines. Sections:

| Section | Contents |
|---------|---------|
| Design tokens | `--font-dm-sans`, `--font-dm-mono`, color vars |
| Typography | `hero-headline`, `section-title`, `section-label` |
| Cards | `.card`, `.terminal-shell`, `.terminal-body` |
| Animations | `animate-fade-up`, `cursor-blink`, `pulseDot` |
| Responsive | Media queries for hero grid, agent grid, regulator grid |
| Utilities | Badge variants, button variants |

No Tailwind component classes are used in layout-sensitive places — breakpoints are managed inline in TSX with `className="responsive-grid"` + a `<style dangerouslySetInnerHTML>` block per component.

---

## Environment Variables — `.env.local`

```env
NEXT_PUBLIC_LENDING_PROTOCOL=0x...
NEXT_PUBLIC_COMPLIANCE_REGISTRY=0x...
NEXT_PUBLIC_REGULATOR_PORTAL=0x...
NEXT_PUBLIC_ULTRA_VERIFIER=0x...
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_MOCK_WETH=0x...
NEXT_PUBLIC_MOCK_USDC=0x...
```

All `NEXT_PUBLIC_` prefixed — safe to expose (these are public contract addresses on a public testnet).

---

## Running Locally

```bash
cd dashboard
npm install
npm run dev   # http://localhost:3000
```

Requires `.env.local` with deployed contract addresses. See `DEPLOY.md` for the full deploy-then-launch sequence.
