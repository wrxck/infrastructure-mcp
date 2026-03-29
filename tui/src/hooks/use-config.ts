import { useState, useEffect } from "react";
import { loadConfig, saveConfig, type TuiConfig } from "../config.js";

export function useConfig(configPath?: string) {
  const [config, setConfig] = useState<TuiConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const result = loadConfig(configPath);
    setConfig(result);
    setLoaded(true);
  }, [configPath]);

  function save(newConfig: TuiConfig) {
    saveConfig(newConfig, configPath);
    setConfig(newConfig);
  }

  return { config, loaded, needsSetup: loaded && config === null, save };
}
