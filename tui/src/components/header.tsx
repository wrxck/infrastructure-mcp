import { Box, Text } from "ink";
import { HeaderProps } from "../types/index.js";

export default function Header({ title, breadcrumb, version }: HeaderProps) {
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between" width="100%">
        <Text bold>
          {breadcrumb ? `← ${breadcrumb}  ` : ""}{title}
          {version ? <Text dimColor> v{version}</Text> : null}
        </Text>
        <Text dimColor>q quit  s settings  ? help</Text>
      </Box>
      <Text dimColor>{"─".repeat(process.stdout.columns ?? 80)}</Text>
    </Box>
  );
}
