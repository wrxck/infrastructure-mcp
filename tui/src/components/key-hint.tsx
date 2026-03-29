import React from "react";
import { Box, Text } from "ink";

interface Hint { key: string; label: string; }
interface KeyHintProps { hints: Hint[]; }

export default function KeyHint({ hints }: KeyHintProps) {
  return (
    <Box>
      {hints.map((h, i) => (
        <Text key={h.key}>
          {i > 0 ? "   " : ""}
          <Text bold>{h.key}</Text>
          <Text dimColor> {h.label}</Text>
        </Text>
      ))}
    </Box>
  );
}
