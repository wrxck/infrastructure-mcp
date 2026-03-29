import React from "react";
import { Box, Text, useInput } from "ink";

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function Confirm({ message, onConfirm, onCancel }: ConfirmProps) {
  useInput((input) => {
    if (input === "y" || input === "Y") onConfirm();
    if (input === "n" || input === "N" || input === "q") onCancel();
  });
  return (
    <Box flexDirection="column">
      <Text>{message}</Text>
      <Text dimColor>Press y to confirm, n to cancel</Text>
    </Box>
  );
}
