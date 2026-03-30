import { Text } from "ink";
import { StatusBadgeProps } from "../types/index.js";

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
