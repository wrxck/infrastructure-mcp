import React from "react";
import { Text } from "ink";

interface StatusBadgeProps {
  status: "active" | "pending" | "error" | "ok";
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  switch (status) {
    case "active":
    case "ok":
      return <Text color="green">● {label ?? status}</Text>;
    case "pending":
      return <Text dimColor>○ {label ?? status}</Text>;
    case "error":
      return <Text color="red">✗ {label ?? status}</Text>;
  }
}
