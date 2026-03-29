import React from "react";
import { Box, Text } from "ink";

interface HeaderProps { title: string; breadcrumb?: string; version?: string; }

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
