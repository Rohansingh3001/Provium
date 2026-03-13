from agno.agent import Agent
from agno.models.groq import Groq
from agno.tools.duckduckgo import DuckDuckGoTools
from tools.chain_tools import get_all_positions, get_pending_regulator_requests, get_latest_compliance_report, get_current_position_root

watcher_agent = Agent(
    name="Provium Watcher",
    role="Monitor DeFi protocol compliance state and OFAC updates",
    # compound-beta: Groq's compound model — autonomously orchestrates sub-calls,
    # searches the web, and synthesises results without the user prompting each step.
    model=Groq(id="compound-beta"),
    tools=[
        DuckDuckGoTools(),
        get_all_positions,
        get_pending_regulator_requests,
        get_latest_compliance_report,
        get_current_position_root,
    ],
    instructions=[
        "You monitor the Provium lending protocol for compliance issues.",
        "Every time you run, you MUST:",
        "1. Call get_all_positions() and analyze current health factors",
        "2. Call get_pending_regulator_requests() for urgent tasks",
        "3. Call get_latest_compliance_report() to check proof freshness",
        "4. Search DuckDuckGo for 'OFAC SDN list update today' to check if sanctions list changed",
        "5. Search DuckDuckGo for 'DeFi compliance regulation news today' for context",
        "Return a structured JSON report with:",
        "  - positions_status: summary of all positions and ratios",
        "  - pending_requests: list of unfulfilled regulator requests",
        "  - hours_since_last_proof: from latest compliance report",
        "  - ofac_news: what you found about OFAC updates today",
        "  - risk_level: 'low' | 'medium' | 'high' | 'critical'",
        "  - recommended_actions: list of what needs to happen now",
        "Be specific. Be thorough. The Analyst agent depends on your report."
    ],
)
