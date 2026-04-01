export interface ToolResult {
    content: string;
    isError: boolean;
}

export interface ToolInfo {
    name: string;
    description: string;
}

export interface McpClient {
    connect(): Promise<void>;
    callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult>;
    listTools(): Promise<ToolInfo[]>;
    isConnected(): boolean;
    disconnect(): Promise<void>;
}

export interface Tool {
    name: string;
    description?: string;
}

export interface TuiConfig {
    jarPath: string;
    env: Record<string, string>;
    experienceLevel: "learner" | "comfortable" | "professional";
}

export type Screen =
    | "loading"
    | "setup"
    | "dashboard"
    | "zone-detail"
    | "onboard"
    | "audit"
    | "fleet"
    | "settings";

export interface AppProps {
    initialScreen?: string;
    jarFlag?: string;
    configPath?: string;
}

export interface Zone {
    id: string;
    name: string;
    status: string
    recordCount?: number;
    ssl?: string;
}

export interface ZoneDetailProps {
    zone: Zone;
    onBack: () => void;
}

export interface DnsRecord {
    type: string;
    name: string;
    content: string;
    proxied?: boolean;
}

export interface ProtectionStatus {
    setting: string;
    category: string;
    expected: string;
    actual: string;
    pass: boolean;
}

export interface AuditRow {
    domain: string;
    total: number;
    passed: number;
    failed: number;
    result: string;
    [key: string]: string | number;
}

export interface AuditProps {
    onBack: () => void;
}

export interface SetupProps {
    onComplete: (config: TuiConfig) => void;
}

export type ExperienceLevel = "learner" | "comfortable" | "professional";

export type Step =
    | "welcome"
    | "experience"
    | "source-review"
    | "cf-auth-type"
    | "cf-fields"
    | "nc-fields"
    | "jar-path"
    | "summary";

export interface FormState {
    experienceLevel: ExperienceLevel;
    cfAuthType: "global" | "token";
    cfApiKey: string;
    cfEmail: string;
    cfToken: string;
    cfAccountId: string;
    ncApiUser: string;
    ncApiKey: string;
    ncClientIp: string;
    jarPath: string;
}

export type CfGlobalField = "cfApiKey" | "cfEmail" | "cfAccountId";
export type CfTokenField = "cfToken" | "cfAccountId";
export type NcField = "ncApiUser" | "ncApiKey" | "ncClientIp";

export interface SettingsProps {
    config: TuiConfig | null;
    onRunSetup: () => void;
    onBack: () => void;
}

export interface FleetApp {
    name: string;
    domain?: string;
    status?: string;
    [key: string]: unknown;
}

export interface FleetProps {
    onBack: () => void;
}

export interface FleetDomain {
    name: string;
}

export interface DashboardProps {
    onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export interface StatusBadgeProps {
    status: "active" | "pending" | "error" | "ok";
    label?: string;
}

export interface ConfirmProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export interface HeaderProps {
    title: string;
    breadcrumb?: string;
    version?: string;
}

export interface Hint {
    key: string;
    label: string;
}

export interface KeyHintProps {
    hints: Hint[];
}

export interface SpinnerProps {
    label: string;
}

export interface Column {
    key: string;
    header: string;
    width?: number;
    align?: "left" | "right";
}

export interface TableProps {
    columns: Column[];
    rows: Record<string, string | number>[];
    selectedIndex?: number;
    maxWidth?: number;
}

export interface McpContextValue {
    client: McpClient | null;
    callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>;
    loading: boolean;
    error: string | null;
}