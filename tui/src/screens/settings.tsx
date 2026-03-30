import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { maskSecret } from "../config.js";
import Header from "../components/header.js";
import KeyHint from "../components/key-hint.js";
import { SettingsProps } from "../types/index.js";

const SECRET_KEYS = [
  "CLOUDFLARE_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "NAMECHEAP_API_KEY",
];

function formatEnvValue(key: string, value: string): string {
  if (SECRET_KEYS.includes(key)) {
    return maskSecret(value);
  }

  return value;
}

const MENU_ITEMS = [
  { label: "Re-run setup wizard", value: "setup" },
  { label: "Back to dashboard", value: "back" },
];

export default function Settings({ config, onRunSetup, onBack }: SettingsProps) {
  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
  });

  function handleSelect(item: { value: string }) {
    if (item.value === "setup") {
      onRunSetup();
    }

    if (item.value === "back") {
      onBack();
    }
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Header title="Settings" breadcrumb="Dashboard" />

      {config === null ? (
        <Text dimColor>No configuration found. Run the setup wizard to configure.</Text>
      ) : (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text bold>JAR Path:</Text>
            <Text>  {config.jarPath || "(auto-discover)"}</Text>
          </Box>

          <Box flexDirection="column">
            <Text bold>Experience Level:</Text>
            <Text>  {config.experienceLevel}</Text>
          </Box>

          {Object.keys(config.env).length > 0 && (
            <Box flexDirection="column">
              <Text bold>Environment:</Text>
              {Object.entries(config.env).map(([key, value]) => (
                <Text key={key}>
                  {"  "}{key}: {formatEnvValue(key, value)}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Box flexDirection="column">
        <Text bold>Actions:</Text>
        <SelectInput items={MENU_ITEMS} onSelect={handleSelect} />
      </Box>

      <KeyHint hints={[{ key: "Esc", label: "back" }]} />
    </Box>
  );
}
