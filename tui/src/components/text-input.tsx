import { Box, Text } from "ink";
import InkTextInput from "ink-text-input";

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  mask?: boolean;
  hint?: string;
}

export default function TextInput({ label, value, onChange, onSubmit, mask, hint }: TextInputProps) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>{label}: </Text>
        <InkTextInput value={value} onChange={onChange} onSubmit={onSubmit} mask={mask ? "•" : undefined} />
      </Box>
      {hint ? <Text dimColor>  {hint}</Text> : null}
    </Box>
  );
}
