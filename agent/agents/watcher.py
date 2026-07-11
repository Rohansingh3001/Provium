from agno.agent import Agent
from agno.models.groq import Groq

watcher_agent = Agent(
    name="Provium Watcher",
    role="Monitor DeFi lending protocol collateral state on-chain",
    model=Groq(id="llama-3.3-70b-versatile"),
    instructions=[
        "You monitor the Provium lending protocol for compliance issues.",
        "You will receive on-chain state from the orchestrator prompt.",
        "Use only the provided state and give a concise risk summary.",
        "If external sanctions/news data is not available in the prompt, omit sanctions commentary.",
        "Return a structured JSON report with:",
        "  - positions_status: summary of all positions and ratios",
        "  - pending_requests: list of unfulfilled regulator requests",
        "  - hours_since_last_proof: from latest compliance report",
        "  - risk_level: 'low' | 'medium' | 'high' | 'critical'",
        "  - recommended_actions: list of what needs to happen now",
        "Be specific. Be thorough. The Analyst agent depends on your report."
    ],
)
