import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMcp } from "../hooks/use-mcp.js";
import Table from "../components/table.js";
import Header from "../components/header.js";
import KeyHint from "../components/key-hint.js";
import Spinner from "../components/spinner.js";

interface DnsRecord {
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
}

interface ProtectionStatus {
  setting: string;
  category: string;
  expected: string;
  actual: string;
  pass: boolean;
}

interface Zone {
  id: string;
  name: string;
  status: string;
}

interface ZoneDetailProps {
  zone: Zone;
  onBack: () => void;
}

const DNS_COLUMNS = [
  { key: "type", header: "Type" },
  { key: "name", header: "Name" },
  { key: "content", header: "Content" },
  { key: "proxied", header: "Proxied" },
];

const PROTECTION_COLUMNS = [
  { key: "setting", header: "Setting" },
  { key: "category", header: "Category" },
  { key: "expected", header: "Expected" },
  { key: "status", header: "Status" },
];

const KEY_HINTS = [
  { key: "Esc", label: "back" },
  { key: "p", label: "apply protection" },
];

export default function ZoneDetail({ zone, onBack }: ZoneDetailProps) {
  const { callTool } = useMcp();
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [protection, setProtection] = useState<ProtectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const [dnsResult, protResult] = await Promise.all([
          callTool("cloudflare_get_dns", { domain: zone.name }),
          callTool("cloudflare_get_protection_status", { domain: zone.name }),
        ]);

        if (!dnsResult.isError) {
          try {
            const parsed = JSON.parse(dnsResult.content);
            setDnsRecords(Array.isArray(parsed) ? parsed : []);
          } catch {
            setDnsRecords([]);
          }
        }

        if (!protResult.isError) {
          try {
            const parsed = JSON.parse(protResult.content);
            setProtection(Array.isArray(parsed) ? parsed : []);
          } catch {
            setProtection([]);
          }
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to load zone details");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [zone.name]);

  useInput((_input, key) => {
    if (key.escape) onBack();
    if (_input === "p") {
      // apply protection — fire and forget in this view
      callTool("apply_protection", { domain: zone.name });
    }
  });

  const dnsRows = dnsRecords.map(r => ({
    type: r.type,
    name: r.name,
    content: r.content,
    proxied: r.proxied ? "●" : "○",
  }));

  const protRows = protection.map(p => ({
    setting: p.setting,
    category: p.category,
    expected: p.expected,
    status: p.pass ? `✓ ok` : `✗ ${p.actual}`,
  }));

  return (
    <Box flexDirection="column" gap={1}>
      <Header title={zone.name} breadcrumb="Dashboard" />

      {loading ? (
        <Spinner label={`Loading ${zone.name}...`} />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : (
        <>
          <Box flexDirection="column">
            <Text bold>DNS Records</Text>
            <Table columns={DNS_COLUMNS} rows={dnsRows} />
          </Box>

          <Box flexDirection="column">
            <Text bold>Protection Audit</Text>
            <Table columns={PROTECTION_COLUMNS} rows={protRows} />
          </Box>
        </>
      )}

      <KeyHint hints={KEY_HINTS} />
    </Box>
  );
}
