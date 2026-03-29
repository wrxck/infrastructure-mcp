import React, { useState, useEffect, useCallback } from "react";
import { useApp, useInput } from "ink";
import { useConfig } from "./hooks/use-config.js";
import { McpContext } from "./hooks/use-mcp.js";
import { createMcpClient, type McpClient, type ToolResult } from "./mcp-client.js";
import { findJar, type TuiConfig } from "./config.js";
import Spinner from "./components/spinner.js";
import Setup from "./screens/setup.js";
import Dashboard from "./screens/dashboard.js";
import ZoneDetail from "./screens/zone-detail.js";
import Onboard from "./screens/onboard.js";
import Audit from "./screens/audit.js";
import Fleet from "./screens/fleet.js";
import Settings from "./screens/settings.js";

type Screen =
  | "loading"
  | "setup"
  | "dashboard"
  | "zone-detail"
  | "onboard"
  | "audit"
  | "fleet"
  | "settings";

interface AppProps {
  initialScreen?: string;
  jarFlag?: string;
  configPath?: string;
}

export default function App({ initialScreen, jarFlag, configPath }: AppProps) {
  const { exit } = useApp();
  const { config, loaded, needsSetup, save } = useConfig(configPath);

  const [screen, setScreen] = useState<Screen>("loading");
  const [screenParams, setScreenParams] = useState<Record<string, unknown>>({});
  const [mcpClient, setMcpClient] = useState<McpClient | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // q to exit (except during setup)
  useInput(
    (input) => {
      if (input === "q" && screen !== "setup") {
        exit();
      }
    },
    { isActive: screen !== "setup" }
  );

  const navigate = useCallback(
    (target: string, params?: Record<string, unknown>) => {
      setScreen(target as Screen);
      setScreenParams(params ?? {});
    },
    []
  );

  const connectAndGo = useCallback(
    async (cfg: TuiConfig) => {
      const jarPath = jarFlag ?? cfg.jarPath ?? findJar() ?? "";
      const client = createMcpClient(jarPath, cfg.env);
      try {
        await client.connect();
        setMcpClient(client);
        setScreen("dashboard");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setConnectError(msg);
        setScreen("setup");
      }
    },
    [jarFlag]
  );

  useEffect(() => {
    if (!loaded) return;

    if (needsSetup || initialScreen === "setup") {
      setScreen("setup");
      return;
    }

    if (config) {
      connectAndGo(config);
    }
  }, [loaded, needsSetup, config, initialScreen, connectAndGo]);

  // MCP context value
  const callTool = useCallback(
    async (name: string, args?: Record<string, unknown>): Promise<ToolResult> => {
      if (!mcpClient) return { content: "Not connected", isError: true };
      return mcpClient.callTool(name, args);
    },
    [mcpClient]
  );

  const mcpContextValue = {
    client: mcpClient,
    callTool,
    loading: false,
    error: connectError,
  };

  if (screen === "loading") {
    return <Spinner label="Loading..." />;
  }

  if (screen === "setup") {
    return (
      <Setup
        onComplete={(cfg) => {
          save(cfg);
          connectAndGo(cfg);
        }}
      />
    );
  }

  return (
    <McpContext.Provider value={mcpContextValue}>
      {screen === "dashboard" && (
        <Dashboard onNavigate={navigate} />
      )}
      {screen === "zone-detail" && (
        <ZoneDetail
          zone={screenParams.zone as { id: string; name: string; status: string }}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "onboard" && (
        <Onboard
          onComplete={() => setScreen("dashboard")}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "audit" && (
        <Audit onBack={() => setScreen("dashboard")} />
      )}
      {screen === "fleet" && (
        <Fleet onBack={() => setScreen("dashboard")} />
      )}
      {screen === "settings" && (
        <Settings
          config={config}
          onRunSetup={() => setScreen("setup")}
          onBack={() => setScreen("dashboard")}
        />
      )}
    </McpContext.Provider>
  );
}
