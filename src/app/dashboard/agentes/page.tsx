import { AGENTS } from "@/lib/agents";
import { AGENT_ENDPOINTS } from "@/lib/agentEndpoints";
import AgentConsole from "@/components/dashboard/AgentConsole";

export default function AgentsPage() {
  const agents = AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    summary: a.summary,
    status: a.status,
    endpoint: AGENT_ENDPOINTS[a.id],
  }));

  return (
    <>
      <h1 style={{ fontSize: 30 }}>Agentes</h1>
      <p className="muted" style={{ marginTop: 6, maxWidth: 720 }}>
        Lanza cualquiera de los 25 agentes a mano con tus propios datos. El orquestador usa estos mismos agentes de forma automática en las campañas activas.
      </p>
      <AgentConsole agents={agents} />
    </>
  );
}
