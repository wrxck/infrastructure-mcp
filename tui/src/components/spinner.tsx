import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import { SpinnerProps } from "../types/index.js";

export default function Spinner({ label }: SpinnerProps) {
  return (
    <Box>
      <Text color="cyan"><InkSpinner type="dots" /></Text>
      <Text> {label}</Text>
    </Box>
  );
}
