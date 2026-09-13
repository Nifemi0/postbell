import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { PostbellResearchResult } from "./postbellData";

interface LlmConnection {
  baseUrl: string;
  model: string;
  apiKey: string;
  provider: string;
  createdAt: string;
}

const connections = new Map<string, LlmConnection>();
const connectionFile = path.join(process.cwd(), "data", "postbell-llm.json");
let environmentConnection: LlmConnection | undefined;

try {
  if (fs.existsSync(connectionFile)) {
    const stored = JSON.parse(fs.readFileSync(connectionFile, "utf8"));
    Object.entries(stored).forEach(([sessionId, connection]) => connections.set(sessionId, connection as LlmConnection));
  }
} catch {
  // Ignore an unavailable local connection file and use built-in synthesis.
}

function persistConnections() {
  fs.mkdirSync(path.dirname(connectionFile), { recursive: true });
  const stored = Object.fromEntries(connections.entries());
  fs.writeFileSync(connectionFile, JSON.stringify(stored, null, 2), { encoding: "utf8", mode: 0o600 });
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The model endpoint must use HTTP or HTTPS.");
  return url.toString().replace(/\/$/, "");
}

try {
  if (process.env.POSTBELL_LLM_BASE_URL && process.env.POSTBELL_LLM_MODEL) {
    environmentConnection = {
      baseUrl: normalizeBaseUrl(process.env.POSTBELL_LLM_BASE_URL),
      model: process.env.POSTBELL_LLM_MODEL,
      apiKey: process.env.POSTBELL_LLM_API_KEY || "",
      provider: process.env.POSTBELL_LLM_PROVIDER || "Environment",
      createdAt: new Date().toISOString()
    };
  }
} catch {}

function resolveConnection(sessionId?: string) {
  if (sessionId && connections.has(sessionId)) return connections.get(sessionId);
  // Restore the single local workspace connection when a browser loses localStorage.
  // The credential never leaves this process; only the generated response is returned.
  return environmentConnection || [...connections.values()][0];
}

function completionUrl(baseUrl: string): string {
  return baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
}

export function createLlmConnection(input: { baseUrl?: string; model?: string; apiKey?: string; provider?: string }) {
  const baseUrl = normalizeBaseUrl(input.baseUrl || "");
  const model = (input.model || "").trim();
  const apiKey = (input.apiKey || "").trim();
  if (!model) throw new Error("Choose a model.");
  if (!apiKey && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) throw new Error("Enter an API key.");
  const sessionId = randomUUID();
  connections.set(sessionId, { baseUrl, model, apiKey, provider: (input.provider || "Custom").trim(), createdAt: new Date().toISOString() });
  persistConnections();
  return { sessionId, status: getLlmConnectionStatus(sessionId) };
}

export function getLlmConnectionStatus(sessionId?: string) {
  const connection = resolveConnection(sessionId);
  if (!connection) return { configured: false };
  return {
    configured: true,
    provider: connection.provider,
    model: connection.model,
    baseUrl: connection.baseUrl,
    createdAt: connection.createdAt,
    keyHint: connection.apiKey ? `••••${connection.apiKey.slice(-4)}` : "Local model"
  };
}

export function removeLlmConnection(sessionId?: string) {
  if (sessionId) { connections.delete(sessionId); persistConnections(); }
}

async function callConnection(connection: LlmConnection, messages: Array<{ role: "system" | "user"; content: string }>, maxTokens = 420) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const isDeepSeek = connection.baseUrl.includes("api.deepseek.com");
    const response = await fetch(completionUrl(connection.baseUrl), {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: connection.model,
        messages,
        ...(isDeepSeek ? { thinking: { type: "disabled" } } : { temperature: 0.2 }),
        max_tokens: maxTokens
      })
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `Model returned HTTP ${response.status}`);
    const message = payload?.choices?.[0]?.message;
    const content = message?.content ?? payload?.choices?.[0]?.text ?? payload?.output_text;
    if (typeof content !== "string" || !content.trim()) throw new Error("The model returned an empty response.");
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function testLlmConnection(sessionId?: string) {
  const connection = resolveConnection(sessionId);
  if (!connection) throw new Error("Model connection not found.");
  const reply = await callConnection(connection, [{ role: "user", content: "Reply with exactly: POSTBELL_CONNECTED" }], 20);
  return { ok: true, reply, model: connection.model };
}

function parseJsonReply(content: string): any {
  const cleaned = content.replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/, "").trim();
  return JSON.parse(cleaned);
}

export async function enhanceResearchWithLlm(sessionId: string | undefined, result: PostbellResearchResult): Promise<PostbellResearchResult> {
  const connection = resolveConnection(sessionId);
  if (!connection) throw new Error("No AI model is connected. Open Model Settings and connect a provider before running research.");
  const evidence = result.evidence.map((item, index) => `${index + 1}. [${item.status}] ${item.title}: ${item.detail}`).join("\n");
  try {
    const content = await callConnection(connection, [
      {
        role: "system",
        content: "You are Postbell, a sharp human market analyst writing a short morning note. Use only the supplied evidence. Never invent a catalyst, price, filing, source, VWAP, gamma, options data, macro signal, order-flow reading, or news headline. This run contains Bitget ticker/peer observations and SEC filing status only; do not imply any other indicator was measured. If the evidence cannot answer part of the question, say 'I do not have that data in this run.' Avoid canned phrases, generic disclaimers, labels like 'the move is supported', and repeated advice. Mention the actual symbols, percentages, volume, and evidence status when useful. Write in natural, direct sentences a trader would actually say. Return valid JSON only with five string fields: detect, connect, decide, analyst, uncertainty."
      },
      {
        role: "user",
        content: `Question: ${result.question}\nSymbol: ${result.symbol}\nEvidence:\n${evidence}\n\nAnswer the question as a concise, specific morning note. Each field should add new information. Preserve uncertainty. Do not recommend an entry, exit, fade, or short unless the supplied evidence directly supports that action. If asked for an indicator or source absent from the evidence, say you do not have that data in this run.`
      }
    ]);
    const parsed = parseJsonReply(content);
    const safe = (value: unknown, fallback: string) => {
      if (typeof value !== "string" || !value.trim()) return fallback;
      const text = value.trim().slice(0, 700);
      return /\b(gamma|vwap|options chain|implied volatility|macro signal|session VWAP|latest news)\b/i.test(text)
        ? `${fallback} I do not have that indicator in this run.`
        : text;
    };
    return {
      ...result,
      steps: {
        detect: safe(parsed.detect, result.steps.detect),
        connect: safe(parsed.connect, result.steps.connect),
        decide: safe(parsed.decide, result.steps.decide)
      },
      analyst: safe(parsed.analyst, `Synthesized by ${connection.model}.`),
      uncertainty: safe(parsed.uncertainty, result.uncertainty)
    };
  } catch (error: any) {
    throw new Error(`${connection.provider} could not return a research response${error?.message ? `: ${error.message}` : "."}`);
  }
}
