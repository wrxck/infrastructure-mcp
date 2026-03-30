import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMcp } from "../hooks/use-mcp.js";
import Table from "../components/table.js";
import Header from "../components/header.js";
import KeyHint from "../components/key-hint.js";
import Spinner from "../components/spinner.js";
import { DashboardProps, FleetDomain, Zone } from "../types/index.js";

const ZONE_COLUMNS = [
  { key: "name", header: "Domain" },
  { key: "status", header: "Status" },
  { key: "recordCount", header: "Records" },
  { key: "ssl", header: "SSL" },
];

const KEY_HINTS = [
  { key: "↑↓", label: "navigate" },
  { key: "Enter", label: "drill in" },
  { key: "o", label: "onboard" },
  { key: "a", label: "audit" },
  { key: "r", label: "refresh" },
  { key: "s", label: "settings" },
  { key: "f", label: "fleet" },
];

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { callTool } = useMcp();
  const [zones, setZones] = useState<Zone[]>([]);
  const [fleetDomains, setFleetDomains] = useState<FleetDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);

      try {
        const [zonesResult, fleetResult] = await Promise.all([
          callTool("cloudflare_list_zones"),
          callTool("fleet_list_domains"),
        ]);

        if (!zonesResult.isError) {
          try {
            const parsed = JSON.parse(zonesResult.content);

            setZones(Array.isArray(parsed) ? parsed : []);
          } catch {
            setZones([]);
          }
        }

        if (!fleetResult.isError) {
          try {
            const parsed = JSON.parse(fleetResult.content);

            setFleetDomains(Array.isArray(parsed) ? parsed : []);
          } catch {
            setFleetDomains([]);
          }
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    }

    if (key.downArrow) {
      setSelectedIndex(i => Math.min(zones.length - 1, i + 1));
    }

    if (key.return && zones.length > 0) {
      const zone = zones[selectedIndex];

      if (zone) {
        onNavigate("zone-detail", { zone });
      }
    }

    if (_input === "o") {
      onNavigate("onboard");
    }

    if (_input === "a") {
      onNavigate("audit");
    }

    if (_input === "r") {
      setLoading(true);
      callTool("cloudflare_list_zones").then(r => {
        if (!r.isError) {
          try {
            setZones(JSON.parse(r.content));
          } catch {
            setZones([]);
          }
        }

        setLoading(false);
      });
    }

    if (_input === "s") {
      onNavigate("settings");
    }

    if (_input === "f") {
      onNavigate("fleet");
    }
  });

  const zoneRows = zones.map(z => ({
    name: z.name,
    status: z.status,
    recordCount: z.recordCount ?? 0,
    ssl: z.ssl ?? "—",
  }));

  return (
    <Box flexDirection="column" gap={1}>
      <Header title="Dashboard" />

      <Box flexDirection="column">
        <Text bold>Cloudflare Zones</Text>
        {loading ? (
          <Spinner label="Loading zones..." />
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : (
          <Table columns={ZONE_COLUMNS} rows={zoneRows} selectedIndex={selectedIndex} />
        )}
      </Box>

      <Box flexDirection="column">
        <Text bold>Fleet Apps</Text>
        {loading ? (
          <Text dimColor>Loading...</Text>
        ) : (
          <Text dimColor>
            {fleetDomains.length} domain{fleetDomains.length !== 1 ? "s" : ""} registered
          </Text>
        )}
      </Box>

      <KeyHint hints={KEY_HINTS} />
    </Box>
  );
}
