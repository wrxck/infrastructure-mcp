import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "../components/text-input.js";
import { maskSecret } from "../config.js";
import { CfGlobalField, CfTokenField, ExperienceLevel, FormState, NcField, SetupProps, Step, TuiConfig } from "../types/index.js";

const EXPERIENCE_ITEMS = [
  {
    label: "I'm learning about infrastructure and want guidance",
    value: "learner" as ExperienceLevel,
  },
  {
    label: "I'm comfortable managing DNS and cloud services",
    value: "comfortable" as ExperienceLevel,
  },
  {
    label: "I'm a DevOps professional — just give me the fields",
    value: "professional" as ExperienceLevel,
  },
];

const CF_AUTH_ITEMS = [
  { label: "Global API Key + Email", value: "global" as const },
  { label: "Scoped API Token", value: "token" as const },
];

const SOURCE_REVIEW_ITEMS = [
  { label: "I've reviewed the source code", value: "reviewed" },
  { label: "I'll review it later", value: "later" },
  { label: "Skip this step", value: "skip" },
];

// Global fields: API Key, Email, Account ID
// Token fields: Token, Account ID

const CF_GLOBAL_FIELDS: Array<{
  key: CfGlobalField;
  label: string;
  mask: boolean;
  learnerHint: string;
}> = [
    {
      key: "cfApiKey",
      label: "Cloudflare API Key",
      mask: true,
      learnerHint:
        "Found at dash.cloudflare.com → My Profile → API Tokens → Global API Key",
    },
    {
      key: "cfEmail",
      label: "Cloudflare Email",
      mask: false,
      learnerHint: "The email address you use to log in to Cloudflare",
    },
    {
      key: "cfAccountId",
      label: "Cloudflare Account ID",
      mask: false,
      learnerHint:
        "Found at dash.cloudflare.com → right sidebar when viewing any zone",
    },
  ];

const CF_TOKEN_FIELDS: Array<{
  key: CfTokenField;
  label: string;
  mask: boolean;
  learnerHint: string;
}> = [
    {
      key: "cfToken",
      label: "Cloudflare API Token",
      mask: true,
      learnerHint:
        "Create a scoped token at dash.cloudflare.com → My Profile → API Tokens",
    },
    {
      key: "cfAccountId",
      label: "Cloudflare Account ID",
      mask: false,
      learnerHint:
        "Found at dash.cloudflare.com → right sidebar when viewing any zone",
    },
  ];

const NC_FIELDS: Array<{
  key: NcField;
  label: string;
  mask: boolean;
  learnerHint: string;
}> = [
    {
      key: "ncApiUser",
      label: "Namecheap API User",
      mask: false,
      learnerHint:
        "Your Namecheap username — enable API at namecheap.com → Profile → Tools → API Access",
    },
    {
      key: "ncApiKey",
      label: "Namecheap API Key",
      mask: true,
      learnerHint: "Generated at namecheap.com → Profile → Tools → API Access",
    },
    {
      key: "ncClientIp",
      label: "Client IP Address",
      mask: false,
      learnerHint:
        "Your server's public IP — must be whitelisted in Namecheap API settings",
    },
  ];

function WelcomeStep({ onNext }: { onNext: () => void }) {
  useInput((_input, key) => {
    if (key.return) {
      onNext();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Infrastructure MCP Setup</Text>
      <Text>
        Welcome! This wizard will help you configure the Infrastructure MCP
        server.
      </Text>
      <Text>
        You'll need your Cloudflare and Namecheap API credentials to complete
        setup.
      </Text>
      <Text dimColor>Press Enter to continue</Text>
    </Box>
  );
}

function ExperienceStep({
  onSelect,
}: {
  onSelect: (level: ExperienceLevel) => void;
}) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>What best describes you?</Text>
      <SelectInput
        items={EXPERIENCE_ITEMS}
        onSelect={(item) => onSelect(item.value)}
      />
    </Box>
  );
}

function SourceReviewStep({ onNext }: { onNext: () => void }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Before entering API credentials</Text>
      <Text>
        We recommend you review the source code before entering any API keys.
        This tool will store credentials on disk and use them to manage your
        infrastructure.
      </Text>
      <Text dimColor>Key files to review the source code:</Text>
      <Box flexDirection="column" marginLeft={2}>
        <Text dimColor>src/main/java/.../ — MCP tool implementations</Text>
        <Text dimColor>tui/src/config.ts — credential storage</Text>
        <Text dimColor>tui/src/mcp-client.ts — how credentials are used</Text>
      </Box>
      <SelectInput
        items={SOURCE_REVIEW_ITEMS}
        onSelect={() => onNext()}
      />
    </Box>
  );
}

function CfAuthTypeStep({
  onSelect,
}: {
  onSelect: (authType: "global" | "token") => void;
}) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Cloudflare Authentication Type</Text>
      <Text>How would you like to authenticate with Cloudflare?</Text>
      <SelectInput
        items={CF_AUTH_ITEMS}
        onSelect={(item) => onSelect(item.value)}
      />
    </Box>
  );
}

function CfFieldsStep({
  form,
  fieldIndex,
  onFieldSubmit,
  isLearner,
  authType,
}: {
  form: FormState;
  fieldIndex: number;
  onFieldSubmit: (key: string, value: string) => void;
  isLearner: boolean;
  authType: "global" | "token";
}) {
  const fields = authType === "global" ? CF_GLOBAL_FIELDS : CF_TOKEN_FIELDS;
  const field = fields[fieldIndex];

  if (!field) return null;

  const value = form[field.key as keyof FormState] as string;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Cloudflare Credentials</Text>
      <Text dimColor>
        Field {fieldIndex + 1} of {fields.length}
      </Text>
      {isLearner && <Text color="yellow">{field.learnerHint}</Text>}
      <TextInput
        label={field.label}
        value={value}
        onChange={(v) => onFieldSubmit(field.key, v)}
        onSubmit={(v) => onFieldSubmit(field.key + ":submit", v)}
        mask={field.mask}
      />
      <Text dimColor>Press Enter to continue</Text>
    </Box>
  );
}

function NcFieldsStep({
  form,
  fieldIndex,
  onFieldSubmit,
  isLearner,
}: {
  form: FormState;
  fieldIndex: number;
  onFieldSubmit: (key: string, value: string) => void;
  isLearner: boolean;
}) {
  const field = NC_FIELDS[fieldIndex];

  if (!field) return null;

  const value = form[field.key as keyof FormState] as string;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Namecheap Credentials</Text>
      <Text dimColor>
        Field {fieldIndex + 1} of {NC_FIELDS.length}
      </Text>
      {isLearner && <Text color="yellow">{field.learnerHint}</Text>}
      <TextInput
        label={field.label}
        value={value}
        onChange={(v) => onFieldSubmit(field.key, v)}
        onSubmit={(v) => onFieldSubmit(field.key + ":submit", v)}
        mask={field.mask}
      />
      <Text dimColor>Press Enter to continue</Text>
    </Box>
  );
}

function JarPathStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>JAR Path</Text>
      <Text>
        Path to the infrastructure-mcp JAR file. Leave blank to
        auto-discover.
      </Text>
      <TextInput
        label="JAR Path"
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        hint="Auto-discovered if empty (looks in ./target/ and ../infrastructure-mcp/target/)"
      />
    </Box>
  );
}

function SummaryStep({
  form,
  onSave,
}: {
  form: FormState;
  onSave: () => void;
}) {
  useInput((_input, key) => {
    if (key.return) {
      onSave();
    }
  });

  const cfFields =
    form.cfAuthType === "global"
      ? [
        { label: "API Key", value: maskSecret(form.cfApiKey) },
        { label: "Email", value: form.cfEmail },
        { label: "Account ID", value: form.cfAccountId },
      ]
      : [
        { label: "API Token", value: maskSecret(form.cfToken) },
        { label: "Account ID", value: form.cfAccountId },
      ];

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Configuration Summary</Text>

      <Box flexDirection="column">
        <Text bold>Experience Level:</Text>
        <Text>  {form.experienceLevel}</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold>Cloudflare ({form.cfAuthType}):</Text>
        {cfFields.map((f) => (
          <Text key={f.label}>
            {"  "}
            {f.label}: {f.value || "(empty)"}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column">
        <Text bold>Namecheap:</Text>
        <Text>  API User: {form.ncApiUser || "(empty)"}</Text>
        <Text>  API Key: {maskSecret(form.ncApiKey)}</Text>
        <Text>  Client IP: {form.ncClientIp || "(empty)"}</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold>JAR Path:</Text>
        <Text>  {form.jarPath || "(auto-discover)"}</Text>
      </Box>

      <Text dimColor>Press Enter to save configuration</Text>
    </Box>
  );
}

export default function Setup({ onComplete }: SetupProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [fieldIndex, setFieldIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    experienceLevel: "comfortable",
    cfAuthType: "global",
    cfApiKey: "",
    cfEmail: "",
    cfToken: "",
    cfAccountId: "",
    ncApiUser: "",
    ncApiKey: "",
    ncClientIp: "",
    jarPath: "",
  });

  const isLearner = form.experienceLevel === "learner";

  function handleExperienceSelect(level: ExperienceLevel) {
    setForm((f) => ({ ...f, experienceLevel: level }));
    if (level === "learner") {
      setStep("source-review");
    } else {
      setStep("cf-auth-type");
    }
  }

  function handleCfAuthType(authType: "global" | "token") {
    setForm((f) => ({ ...f, cfAuthType: authType }));
    setFieldIndex(0);
    setStep("cf-fields");
  }

  function handleCfFieldSubmit(key: string, value: string) {
    const isSubmit = key.endsWith(":submit");
    const actualKey = isSubmit ? key.replace(":submit", "") : key;

    setForm((f) => ({ ...f, [actualKey]: value }));

    if (isSubmit) {
      const fields =
        form.cfAuthType === "global" ? CF_GLOBAL_FIELDS : CF_TOKEN_FIELDS;
      if (fieldIndex < fields.length - 1) {
        setFieldIndex((i) => i + 1);
      } else {
        setFieldIndex(0);
        setStep("nc-fields");
      }
    }
  }

  function handleNcFieldSubmit(key: string, value: string) {
    const isSubmit = key.endsWith(":submit");
    const actualKey = isSubmit ? key.replace(":submit", "") : key;

    setForm((f) => ({ ...f, [actualKey]: value }));

    if (isSubmit) {
      if (fieldIndex < NC_FIELDS.length - 1) {
        setFieldIndex((i) => i + 1);
      } else {
        setFieldIndex(0);
        setStep("jar-path");
      }
    }
  }

  function handleJarPathSubmit(value: string) {
    setForm((f) => ({ ...f, jarPath: value }));
    setStep("summary");
  }

  function handleSave() {
    const env: Record<string, string> = {
      ...(form.cfAuthType === "global"
        ? {
          ...(form.cfApiKey && { CLOUDFLARE_API_KEY: form.cfApiKey }),
          ...(form.cfEmail && { CLOUDFLARE_EMAIL: form.cfEmail }),
        }
        : {
          ...(form.cfToken && { CLOUDFLARE_API_TOKEN: form.cfToken }),
        }),

      ...(form.cfAccountId && { CLOUDFLARE_ACCOUNT_ID: form.cfAccountId }),
      ...(form.ncApiUser && { NAMECHEAP_API_USER: form.ncApiUser }),
      ...(form.ncApiKey && { NAMECHEAP_API_KEY: form.ncApiKey }),
      ...(form.ncClientIp && { NAMECHEAP_CLIENT_IP: form.ncClientIp }),
    };

    onComplete({
      jarPath: form.jarPath,
      env,
      experienceLevel: form.experienceLevel,
    });
  }

  if (step === "welcome") {
    return <WelcomeStep onNext={() => setStep("experience")} />;
  }

  if (step === "experience") {
    return <ExperienceStep onSelect={handleExperienceSelect} />;
  }

  if (step === "source-review") {
    return <SourceReviewStep onNext={() => setStep("cf-auth-type")} />;
  }

  if (step === "cf-auth-type") {
    return <CfAuthTypeStep onSelect={handleCfAuthType} />;
  }

  if (step === "cf-fields") {
    return (
      <CfFieldsStep
        form={form}
        fieldIndex={fieldIndex}
        onFieldSubmit={handleCfFieldSubmit}
        isLearner={isLearner}
        authType={form.cfAuthType}
      />
    );
  }

  if (step === "nc-fields") {
    return (
      <NcFieldsStep
        form={form}
        fieldIndex={fieldIndex}
        onFieldSubmit={handleNcFieldSubmit}
        isLearner={isLearner}
      />
    );
  }

  if (step === "jar-path") {
    return (
      <JarPathStep
        value={form.jarPath}
        onChange={(v) => setForm((f) => ({ ...f, jarPath: v }))}
        onSubmit={handleJarPathSubmit}
      />
    );
  }

  if (step === "summary") {
    return <SummaryStep form={form} onSave={handleSave} />;
  }

  return null;
}
