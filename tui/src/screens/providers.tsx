import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMcp } from "../hooks/use-mcp.js";
import Table from "../components/table.js";
import Header from "../components/header.js";
import KeyHint from "../components/key-hint.js";
import Spinner from "../components/spinner.js";

interface ProviderInfo {
  name: string;
  roles: string[];
  connected: boolean;
  toolCount: number;
  error?: string;
}

interface ProvidersProps {
  onBack: () => void;
}

const PROVIDER_COLUMNS = [
  { key: "name", header: "Provider" },
  { key: "roles", header: "Roles" },
  { key: "status", header: "Status" },
  { key: "tools", header: "Tools", align: "right" as const },
];

const KEY_HINTS = [
  { key: "r", label: "refresh" },
  { key: "Esc", label: "back" },
];

export default function Providers({ onBack }: ProvidersProps) {
  const { callTool } = useMcp();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProviders() {
    setLoading(true);
    setError(null);

    try {
      const result = await callTool("provider_status");

      if (result.isError) {
        setError(result.content);
        setProviders([]);
      } else {
        try {
          const parsed = JSON.parse(result.content);
          setProviders(Array.isArray(parsed) ? parsed : []);
        } catch {
          setProviders([]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProviders();
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
    if (_input === "r") {
      fetchProviders();
    }
  });

  const connectedCount = providers.filter((p) => p.connected).length;
  const totalTools = providers.reduce((sum, p) => sum + p.toolCount, 0);

  const rows = providers.map((p) => ({
    name: p.name,
    roles: p.roles.join(", "),
    status: p.connected ? "connected" : p.error ?? "disconnected",
    tools: p.toolCount,
  }));

  return (
    <Box flexDirection="column" gap={1}>
      <Header title="Providers" breadcrumb="Dashboard" />

      {loading ? (
        <Spinner label="Loading provider status..." />
      ) : error ? (
        <Box flexDirection="column">
          <Text color="red">{error}</Text>
          <Text dimColor>
            The orchestrator may not expose a provider_status tool.
            This screen requires the v1.3 orchestrator.
          </Text>
        </Box>
      ) : providers.length === 0 ? (
        <Text dimColor>No providers configured.</Text>
      ) : (
        <Box flexDirection="column">
          <Text>
            {connectedCount}/{providers.length} providers connected, {totalTools} tools available
          </Text>
          <Table columns={PROVIDER_COLUMNS} rows={rows} />
        </Box>
      )}

      <KeyHint hints={KEY_HINTS} />
    </Box>
  );
}
