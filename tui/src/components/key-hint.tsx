import { Box, Text } from "ink";
import { Hint, KeyHintProps } from "../types/index.js";

export default function KeyHint({ hints }: KeyHintProps) {
  return (
    <Box>
      {hints.map((h: Hint, i: number) => (
        <Text key={h.key}>
          {i > 0 ? "   " : ""}
          <Text bold>{h.key}</Text>
          <Text dimColor> {h.label}</Text>
        </Text>
      ))}
    </Box>
  );
}
