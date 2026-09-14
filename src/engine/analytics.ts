import { Redis } from "@upstash/redis";

export type AnalyticsEventName = "page_view" | "heartbeat" | "research_success" | "research_error" | "model_connected" | "watch_started";

export interface AnalyticsEventInput {
  event: AnalyticsEventName;
  visitorId: string;
  sessionId: string;
  path?: string;
  provider?: string;
  durationMs?: number;
  status?: string;
}

interface StoredEvent extends AnalyticsEventInput {
  at: string;
}

const allowedEvents = new Set<AnalyticsEventName>(["page_view", "heartbeat", "research_success", "research_error", "model_connected", "watch_started"]);
const memoryEvents: StoredEvent[] = [];
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

function clean(value: unknown, max = 80): string {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_./:@ -]/g, "").slice(0, max) : "";
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeAnalyticsEvent(input: any): AnalyticsEventInput {
  const event = clean(input?.event, 32) as AnalyticsEventName;
  const visitorId = clean(input?.visitorId, 64);
  const sessionId = clean(input?.sessionId, 64);
  if (!allowedEvents.has(event)) throw new Error("Unknown analytics event.");
  if (visitorId.length < 8 || sessionId.length < 8) throw new Error("Anonymous session identifiers are required.");
  return {
    event,
    visitorId,
    sessionId,
    path: clean(input?.path || "/", 120) || "/",
    provider: clean(input?.provider || "", 50),
    durationMs: Math.max(0, Math.min(120_000, Number(input?.durationMs) || 0)),
    status: clean(input?.status || "", 40)
  };
}

export async function recordAnalyticsEvent(raw: any): Promise<void> {
  const input = normalizeAnalyticsEvent(raw);
  const now = Date.now();
  const day = dayKey();
  const stored: StoredEvent = { ...input, at: new Date(now).toISOString() };
  if (!redis) {
    memoryEvents.unshift(stored);
    memoryEvents.splice(5_000);
    return;
  }

  const expirySeconds = 60 * 60 * 24 * 35;
  const tasks: Promise<unknown>[] = [
    redis.hincrby(`postbell:metrics:${day}`, input.event, 1),
    redis.pfadd(`postbell:visitors:${day}`, input.visitorId),
    redis.pfadd(`postbell:sessions:${day}`, input.sessionId),
    redis.zadd("postbell:active:visitors", { score: now, member: input.visitorId }),
    redis.zadd("postbell:active:sessions", { score: now, member: input.sessionId }),
    redis.zremrangebyscore("postbell:active:visitors", 0, now - 86_400_000),
    redis.zremrangebyscore("postbell:active:sessions", 0, now - 86_400_000),
    redis.expire(`postbell:metrics:${day}`, expirySeconds),
    redis.expire(`postbell:visitors:${day}`, expirySeconds),
    redis.expire(`postbell:sessions:${day}`, expirySeconds)
  ];
  if (input.event === "page_view") tasks.push(redis.hincrby(`postbell:routes:${day}`, input.path || "/", 1), redis.expire(`postbell:routes:${day}`, expirySeconds));
  if (input.provider && ["research_success", "research_error", "model_connected"].includes(input.event)) tasks.push(redis.hincrby(`postbell:providers:${day}`, input.provider, 1), redis.expire(`postbell:providers:${day}`, expirySeconds));
  if (input.durationMs && input.event.startsWith("research_")) tasks.push(redis.hincrby(`postbell:metrics:${day}`, "research_duration_ms", Math.round(input.durationMs)), redis.hincrby(`postbell:metrics:${day}`, "research_duration_count", 1));
  if (input.event !== "heartbeat") tasks.push(redis.lpush("postbell:recent", JSON.stringify(stored)), redis.ltrim("postbell:recent", 0, 59));
  await Promise.all(tasks);
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, Number(item) || 0]));
}

function recentDays(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (count - index - 1));
    return dayKey(date);
  });
}

export async function getAnalyticsSnapshot() {
  const now = Date.now();
  const days = recentDays(7);
  if (!redis) {
    const cutoff = now - 15 * 60_000;
    const today = dayKey();
    const todayEvents = memoryEvents.filter((item) => item.at.startsWith(today));
    const counts = (items: StoredEvent[]) => Object.fromEntries([...allowedEvents].map((event) => [event, items.filter((item) => item.event === event).length]));
    const routes = Object.entries(todayEvents.filter((item) => item.event === "page_view").reduce<Record<string, number>>((acc, item) => { acc[item.path || "/"] = (acc[item.path || "/"] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
    const providers = Object.entries(todayEvents.filter((item) => item.provider).reduce<Record<string, number>>((acc, item) => { acc[item.provider || "Other"] = (acc[item.provider || "Other"] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
    const researchDurations = todayEvents.filter((item) => item.event.startsWith("research_") && item.durationMs).map((item) => item.durationMs || 0);
    return {
      generatedAt: new Date().toISOString(), persistent: false,
      today: { ...counts(todayEvents), visitors: new Set(todayEvents.map((item) => item.visitorId)).size, sessions: new Set(todayEvents.map((item) => item.sessionId)).size, active: new Set(memoryEvents.filter((item) => Date.parse(item.at) >= cutoff).map((item) => item.visitorId)).size, averageResearchMs: researchDurations.length ? Math.round(researchDurations.reduce((sum, value) => sum + value, 0) / researchDurations.length) : 0 },
      daily: days.map((day) => { const items = memoryEvents.filter((item) => item.at.startsWith(day)); return { day, ...counts(items), visitors: new Set(items.map((item) => item.visitorId)).size, sessions: new Set(items.map((item) => item.sessionId)).size }; }),
      routes: routes.map(([path, views]) => ({ path, views })), providers: providers.map(([provider, runs]) => ({ provider, runs })), recent: memoryEvents.filter((item) => item.event !== "heartbeat").slice(0, 30)
    };
  }

  const [activeVisitors, dailyRows, recentRows] = await Promise.all([
    redis.zcount("postbell:active:visitors", now - 15 * 60_000, "+inf"),
    Promise.all(days.map(async (day) => {
      const [metrics, visitors, sessions, routes, providers] = await Promise.all([
        redis.hgetall(`postbell:metrics:${day}`), redis.pfcount(`postbell:visitors:${day}`), redis.pfcount(`postbell:sessions:${day}`), redis.hgetall(`postbell:routes:${day}`), redis.hgetall(`postbell:providers:${day}`)
      ]);
      return { day, metrics: numericRecord(metrics), visitors: Number(visitors) || 0, sessions: Number(sessions) || 0, routes: numericRecord(routes), providers: numericRecord(providers) };
    })),
    redis.lrange<string>("postbell:recent", 0, 29)
  ]);
  const current = dailyRows[dailyRows.length - 1];
  const totalDuration = current.metrics.research_duration_ms || 0;
  const durationCount = current.metrics.research_duration_count || 0;
  const recent = recentRows.map((item) => { try { return JSON.parse(item); } catch { return null; } }).filter(Boolean);
  return {
    generatedAt: new Date().toISOString(), persistent: true,
    today: { ...current.metrics, visitors: current.visitors, sessions: current.sessions, active: Number(activeVisitors) || 0, averageResearchMs: durationCount ? Math.round(totalDuration / durationCount) : 0 },
    daily: dailyRows.map(({ day, metrics, visitors, sessions }) => ({ day, ...metrics, visitors, sessions })),
    routes: Object.entries(current.routes).sort((a, b) => b[1] - a[1]).map(([path, views]) => ({ path, views })),
    providers: Object.entries(current.providers).sort((a, b) => b[1] - a[1]).map(([provider, runs]) => ({ provider, runs })), recent
  };
}
