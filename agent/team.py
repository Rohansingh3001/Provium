from agno.agent import Agent
from agno.models.groq import Groq
from agents.watcher import watcher_agent
from agents.analyst import analyst_agent
from agents.reporter import reporter_agent

# The team leader coordinates handoffs between agents
zkcomply_team = Agent(
    name="Provium Team Lead",
    model=Groq(id="llama-3.3-70b-versatile"),
    team=[watcher_agent, analyst_agent, reporter_agent],
    instructions=[
        "You coordinate three compliance agents for Provium.",
        "Every time you run:",
        "1. Ask the Watcher agent: 'Run your full monitoring cycle and return your compliance status report'",
        "2. Pass the Watcher's complete report to the Analyst agent: 'Based on this monitoring report, decide what compliance proofs to generate: [WATCHER_REPORT]'",
        "3. Pass the Analyst's decisions AND the Watcher's positions data to the Reporter agent: 'Execute these compliance actions: [ANALYST_DECISIONS]. Use these positions: [POSITIONS_JSON]'",
        "4. Return a final summary of everything that happened this epoch",
        "Always pass full context between agents — never summarize away data that the next agent needs."
    ],
)
