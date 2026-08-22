import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Redis } from "@upstash/redis";
import type { AnalyzeResponse } from "@/types/valuation";

const memory = new Map<string, AnalyzeResponse>();
const MAX_MEMORY = 200;
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const KEY_PREFIX = "carquestions:analysis:";

export type AnalysisStoreBackend = "redis" | "file" | "memory";

function ttlSeconds(): number {
  const raw = process.env.ANALYSIS_TTL_SECONDS;
  if (!raw) return DEFAULT_TTL_SECONDS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
}

function fileDir(): string {
  return process.env.ANALYSIS_STORE_DIR?.trim() || join(process.cwd(), ".data", "analyses");
}

function hasUpstashEnv(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
  );
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

/** Prefer Redis when configured; otherwise file store locally; memory-only on Vercel without Redis. */
export function resolveAnalysisStoreBackend(): AnalysisStoreBackend {
  const forced = process.env.ANALYSIS_STORE?.trim().toLowerCase();
  if (forced === "redis" || forced === "file" || forced === "memory") {
    if (forced === "redis" && !hasUpstashEnv()) return "memory";
    return forced;
  }
  if (hasUpstashEnv()) return "redis";
  if (!isVercelRuntime()) return "file";
  return "memory";
}

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  if (!hasUpstashEnv()) {
    redisClient = null;
    return null;
  }
  try {
    // Prefer official fromEnv; fall back to KV_* aliases from older Vercel KV bindings.
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = Redis.fromEnv();
    } else {
      redisClient = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      });
    }
  } catch {
    redisClient = null;
  }
  return redisClient;
}

function remember(analysis: AnalyzeResponse): void {
  if (memory.size >= MAX_MEMORY) {
    const firstKey = memory.keys().next().value;
    if (firstKey) memory.delete(firstKey);
  }
  memory.set(analysis.id, analysis);
}

function filePath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(fileDir(), `${safe}.json`);
}

async function saveToFile(analysis: AnalyzeResponse): Promise<void> {
  await mkdir(fileDir(), { recursive: true });
  const payload = {
    savedAt: Date.now(),
    ttlSeconds: ttlSeconds(),
    analysis,
  };
  await writeFile(filePath(analysis.id), `${JSON.stringify(payload)}\n`, "utf8");
}

async function loadFromFile(id: string): Promise<AnalyzeResponse | undefined> {
  try {
    const raw = await readFile(filePath(id), "utf8");
    const parsed = JSON.parse(raw) as {
      savedAt?: number;
      ttlSeconds?: number;
      analysis?: AnalyzeResponse;
    };
    if (!parsed.analysis?.id) return undefined;
    const ageMs = Date.now() - (parsed.savedAt ?? 0);
    const ttlMs = (parsed.ttlSeconds ?? ttlSeconds()) * 1000;
    if (ageMs > ttlMs) {
      void unlink(filePath(id)).catch(() => undefined);
      return undefined;
    }
    return parsed.analysis;
  } catch {
    return undefined;
  }
}

async function saveToRedis(analysis: AnalyzeResponse): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`${KEY_PREFIX}${analysis.id}`, analysis, { ex: ttlSeconds() });
}

async function loadFromRedis(id: string): Promise<AnalyzeResponse | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;
  const value = await redis.get<AnalyzeResponse>(`${KEY_PREFIX}${id}`);
  return value ?? undefined;
}

export async function saveAnalysis(analysis: AnalyzeResponse): Promise<void> {
  remember(analysis);
  const backend = resolveAnalysisStoreBackend();
  if (backend === "redis") {
    await saveToRedis(analysis);
    return;
  }
  if (backend === "file") {
    await saveToFile(analysis);
  }
}

export async function getAnalysis(id: string): Promise<AnalyzeResponse | undefined> {
  const cached = memory.get(id);
  if (cached) return cached;

  const backend = resolveAnalysisStoreBackend();
  let loaded: AnalyzeResponse | undefined;
  if (backend === "redis") {
    loaded = await loadFromRedis(id);
  } else if (backend === "file") {
    loaded = await loadFromFile(id);
  }

  if (loaded) remember(loaded);
  return loaded;
}

export function getAnalysisStoreInfo(): {
  backend: AnalysisStoreBackend;
  ttlSeconds: number;
  redisConfigured: boolean;
} {
  return {
    backend: resolveAnalysisStoreBackend(),
    ttlSeconds: ttlSeconds(),
    redisConfigured: hasUpstashEnv(),
  };
}
