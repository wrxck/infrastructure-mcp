import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMcp } from "../hooks/use-mcp.js";
import Table from "../components/table.js";
import Header from "../components/header.js";
import KeyHint from "../components/key-hint.js";
import Spinner from "../components/spinner.js";

interface Zone {
  id: string;
  name: string;
  status: string;
}

interface ProtectionStatus {
  setting: string;
  pass: boolean;
}

interface AuditRow {
  domain: string;
  total: number;
  passed: number;
  failed: number;
  result: string;
  [key: string]: string | number;
}

interface AuditProps {
  onBack: () => void;
}

const AUDIT_COLUMNS = [
  { key: "domain", header: "Domain" },
  { key: "passed", header: "Pass" },
  { key: "failed", header: "Fail" },
  { key: "result", header: "Result" },
];

export default function Audit({ onBack }: AuditProps) {
  const { callTool } = useMcp();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const zonesResult = await callTool("cloudflare_list_zones");
        if (zonesResult.isError) {
          setError(zonesResult.content);
          setLoading(false);
          return;
        }

        let zones: Zone[] = [];
        try {
          const parsed = JSON.parse(zonesResult.content);
          zones = Array.isArray(parsed) ? parsed : [];
        } catch {
          zones = [];
        }

        const auditRows: AuditRow[] = [];

        for (const zone of zones) {
          const protResult = await callTool("cloudflare_get_protection_status", { domain: zone.name });
          let statuses: ProtectionStatus[] = [];
          if (!protResult.isError) {
            try {
              const parsed = JSON.parse(protResult.content);
              statuses = Array.isArray(parsed) ? parsed : [];
            } catch {
              statuses = [];
            }
          }

          const total = statuses.length;
          const passed = statuses.filter(s => s.pass).length;
          const failed = total - passed;

          auditRows.push({
            domain: zone.name,
            total,
            passed,
            failed,
            result: failed === 0 ? "✓ pass" : `✗ ${failed} fail`,
          });
        }

        setRows(auditRows);
      } catch (err: any) {
        setError(err.message ?? "Audit failed");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Header title="Protection Audit" breadcrumb="Dashboard" />

      {loading ? (
        <Spinner label="Running audit..." />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : (
        <Table columns={AUDIT_COLUMNS} rows={rows} />
      )}

      <KeyHint hints={[{ key: "Esc", label: "back" }]} />
    </Box>
  );
}
