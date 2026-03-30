import { createContext, useContext, useState, useCallback } from "react";
import { McpContextValue } from "../types/index.js";

export const McpContext = createContext<McpContextValue>({
  client: null,
  callTool: async () => ({ content: "", isError: true }),
  loading: false,
  error: null,
});

export function useMcp() {
  return useContext(McpContext);
}

export function useToolCall() {
  const { callTool } = useMcp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<string | null>(null);

  const execute = useCallback(
    async (name: string, args?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const result = await callTool(name, args);

        if (result.isError) {
          setError(result.content);
        } else {
          setData(result.content);
        }

        return result;
      } catch (err: any) {
        setError(err.message ?? "Unknown error");

        return { content: err.message, isError: true };
      } finally {
        setLoading(false);
      }
    },
    [callTool]
  );

  return { execute, loading, error, data };
}
