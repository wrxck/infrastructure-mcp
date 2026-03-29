import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMcp } from "../hooks/use-mcp.js";
import Table from "../components/table.js";
import Header from "../components/header.js";
import KeyHint from "../components/key-hint.js";
import Spinner from "../components/spinner.js";

interface FleetApp {
  name: string;
  domain?: string;
  status?: string;
  [key: string]: unknown;
}

interface FleetProps {
  onBack: () => void;
}

const APP_COLUMNS = [
  { key: "name", header: "Name" },
  { key: "domain", header: "Domain" },
  { key: "status", header: "Status" },
];

export default function Fleet({ onBack }: FleetProps) {
  const { callTool } = useMcp();
  const [apps, setApps] = useState<FleetApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const result = await callTool("fleet_list_apps");
        if (result.isError) {
          setError(result.content);
          return;
        }
        try {
          const parsed = JSON.parse(result.content);
          setApps(Array.isArray(parsed) ? parsed : []);
        } catch {
          setApps([]);
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to load fleet apps");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const rows = apps.map(app => ({
    name: app.name ?? "—",
    domain: app.domain ?? "—",
    status: app.status ?? "unknown",
  }));

  return (
    <Box flexDirection="column" gap={1}>
      <Header title="Fleet Apps" breadcrumb="Dashboard" />

      {loading ? (
        <Spinner label="Loading fleet apps..." />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : (
        <>
          <Table columns={APP_COLUMNS} rows={rows} />
          <Text dimColor>{apps.length} app{apps.length !== 1 ? "s" : ""} total</Text>
        </>
      )}

      <KeyHint hints={[{ key: "Esc", label: "back" }]} />
    </Box>
  );
}
