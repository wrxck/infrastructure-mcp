import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMcp } from "../hooks/use-mcp.js";
import Header from "../components/header.js";
import KeyHint from "../components/key-hint.js";
import Spinner from "../components/spinner.js";
import Confirm from "../components/confirm.js";
import TextInput from "../components/text-input.js";

type OnboardStep = "input" | "confirm" | "running" | "done";

interface OnboardResult {
  recordsMigrated?: number;
  protectionApplied?: boolean;
  errors?: string[];
}

interface OnboardProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function Onboard({ onComplete, onBack }: OnboardProps) {
  const { callTool } = useMcp();
  const [step, setStep] = useState<OnboardStep>("input");
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
    if (step === "done" && key.return) {
      onComplete();
    }
  });

  function handleDomainSubmit(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    setDomain(trimmed);
    setStep("confirm");
  }

  async function handleConfirm() {
    setStep("running");
    setError(null);
    try {
      const res = await callTool("onboard_domain", {
        domain,
        migrateRecords: true,
        applyProtection: true,
      });

      if (res.isError) {
        setError(res.content);
        setStep("done");
        return;
      }

      try {
        const parsed = JSON.parse(res.content);
        setResult(parsed);
      } catch {
        setResult({});
      }
      setStep("done");
    } catch (err: any) {
      setError(err.message ?? "Onboarding failed");
      setStep("done");
    }
  }

  function handleCancel() {
    setStep("input");
    setDomain("");
  }

  if (step === "input") {
    return (
      <Box flexDirection="column" gap={1}>
        <Header title="Onboard Domain" breadcrumb="Dashboard" />
        <Text bold>Enter the domain to onboard:</Text>
        <TextInput
          label="Domain"
          value={domain}
          onChange={setDomain}
          onSubmit={handleDomainSubmit}
          hint="e.g. example.com"
        />
        <KeyHint hints={[{ key: "Esc", label: "back" }, { key: "Enter", label: "continue" }]} />
      </Box>
    );
  }

  if (step === "confirm") {
    return (
      <Box flexDirection="column" gap={1}>
        <Header title="Onboard Domain" breadcrumb="Dashboard" />
        <Confirm
          message={`Onboard ${domain}? This will migrate DNS records and apply protection settings.`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
        <KeyHint hints={[{ key: "y", label: "confirm" }, { key: "n", label: "cancel" }, { key: "Esc", label: "back" }]} />
      </Box>
    );
  }

  if (step === "running") {
    return (
      <Box flexDirection="column" gap={1}>
        <Header title="Onboard Domain" breadcrumb="Dashboard" />
        <Spinner label={`Onboarding ${domain}...`} />
      </Box>
    );
  }

  // done
  return (
    <Box flexDirection="column" gap={1}>
      <Header title="Onboard Domain" breadcrumb="Dashboard" />

      {error ? (
        <Box flexDirection="column">
          <Text color="red">Onboarding failed</Text>
          <Text color="red">{error}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color="green">Onboarding complete: {domain}</Text>
          {result?.recordsMigrated !== undefined && (
            <Text>Records migrated: {result.recordsMigrated}</Text>
          )}
          {result?.protectionApplied !== undefined && (
            <Text>Protection applied: {result.protectionApplied ? "yes" : "no"}</Text>
          )}
          {result?.errors && result.errors.length > 0 && (
            <Box flexDirection="column">
              <Text color="yellow">Warnings:</Text>
              {result.errors.map((e, i) => (
                <Text key={i} color="yellow">  {e}</Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      <KeyHint hints={[{ key: "Enter", label: "back to dashboard" }, { key: "Esc", label: "back" }]} />
    </Box>
  );
}
