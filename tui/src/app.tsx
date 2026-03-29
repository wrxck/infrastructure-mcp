import React, { useState } from "react";
import { Box, Text } from "ink";

type Screen = "dashboard" | "setup" | "zone-detail" | "onboard" | "fleet" | "audit" | "settings";

interface AppProps {
  initialScreen?: Screen;
}

export default function App({ initialScreen = "dashboard" }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);

  return (
    <Box flexDirection="column">
      <Text>Infrastructure MCP — screen: {screen}</Text>
    </Box>
  );
}
