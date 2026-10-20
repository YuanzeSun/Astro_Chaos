/** anthropic and openai come from the Claude Code and Codex configs; chatgpt and deepseek are connected in the game. */
export type ProviderId = "anthropic" | "openai" | "chatgpt" | "deepseek";
export const PROVIDERS: readonly ProviderId[] = ["anthropic", "openai", "chatgpt", "deepseek"];
export type Effort = "low" | "medium" | "high" | "xhigh";

export interface SystemBlock {
  text: string;
  /** Mark the end of a stable prefix for prompt caching. */
  cache?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface JsonSpec {
  name: string;
  schema: Record<string, unknown>;
}

export interface ToolSpec {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  input: unknown;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ProviderCall {
  model: string;
  system: SystemBlock[];
  messages: ChatMessage[];
  maxTokens: number;
  effort?: Effort;
  json?: JsonSpec;
  tools?: ToolSpec[];
  cacheKey?: string;
  timeoutMs?: number;
  onText?: (delta: string) => void;
}

export interface ProviderResult {
  text: string;
  toolCalls: ToolCall[];
  /** Model that actually answered (may differ after a server-side fallback). */
  model: string;
  usage: Usage;
  stopReason: string;
  refused: boolean;
}

export interface Provider {
  call(call: ProviderCall): Promise<ProviderResult>;
  listModels(): Promise<string[]>;
}
