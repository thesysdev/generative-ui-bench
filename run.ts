// Generation runner: sends every brief to one model in one or more protocol
// formats and stores the raw responses. Scoring is separate (score.ts), so
// every verdict is reproducible offline from the committed raws.
//
// Usage:
//   BENCH_MODEL=google/gemini-3.6-flash BENCH_LABEL=gemini node run.ts openui jsonrender a2ui
//
// Env:
//   BENCH_MODEL       provider model id (required)
//   BENCH_LABEL       raw/results directory label (required)
//   BENCH_PROVIDER    openrouter (default) | openai | anthropic | google | local
//   BENCH_REPEATS     generations per brief (default 4)
//   BENCH_MAX_TOKENS  output ceiling (default 16384)
//   BENCH_CONCURRENCY parallel requests (default 6)
//   BENCH_TIMEOUT_MS  per-request timeout (default 240000)
//   BENCH_TEMP        temperature (default 0.7; anthropic runs its model default)
//   BENCH_ONLY        comma-separated brief names (probe runs)
//   BENCH_HTML_STYLE  html arm styling condition: plain (default) | tailwind
//   BENCH_REASONING_EFFORT  reasoning override; "none" keeps the family default
//   BENCH_PROVIDER_ORDER    OpenRouter provider routing, e.g. baseten,fireworks
//
// Keys: OPENROUTER_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_KEY.
// Raws are idempotent: existing non-empty files are never regenerated, so an
// interrupted run resumes by re-running the same command.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SCENARIOS, type Brief } from "./briefs/briefs.ts";
import { systemPrompt as openuiSystemPrompt } from "./protocols/openui/prompt.ts";
import {
  systemPrompt as jrSystemPrompt,
  userPrompt as jrUserPrompt,
} from "./protocols/jsonrender/prompt.ts";
import { systemPrompt as htmlSystemPrompt } from "./protocols/html/prompt.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODEL = process.env.BENCH_MODEL;
const LABEL = process.env.BENCH_LABEL;
if (!MODEL || !LABEL) {
  console.error("BENCH_MODEL and BENCH_LABEL are required");
  process.exit(1);
}

type Format = { dir: string; system: () => string; user: (brief: Brief) => string };
const FORMATS: Record<string, Format> = {
  openui: {
    dir: LABEL,
    system: () => openuiSystemPrompt(),
    user: (brief) => brief.prompt,
  },
  jsonrender: {
    dir: LABEL,
    system: () => jrSystemPrompt(),
    user: (brief) => jrUserPrompt(brief.prompt),
  },
  a2ui: {
    dir: LABEL,
    system: () => readFileSync(join(__dirname, "protocols/a2ui/system-prompt.txt"), "utf8"),
    user: (brief) => brief.prompt,
  },
  // Control arm: no catalog, no SDK. BENCH_HTML_STYLE picks plain or tailwind.
  html: {
    dir: LABEL,
    system: () => htmlSystemPrompt(),
    user: (brief) => brief.prompt,
  },
};

const fmts = process.argv.slice(2).filter((f) => FORMATS[f]);
if (!fmts.length) {
  console.error(`pass formats: ${Object.keys(FORMATS).join(" ")}`);
  process.exit(1);
}

const PROVIDER = process.env.BENCH_PROVIDER || "openrouter";
const API_URL =
  PROVIDER === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : PROVIDER === "anthropic"
      ? "https://api.anthropic.com/v1/messages"
      : PROVIDER === "google"
        ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        : PROVIDER === "local"
          ? (process.env.LOCAL_API_URL ?? "http://localhost:8081") + "/v1/chat/completions"
          : "https://openrouter.ai/api/v1/chat/completions";
const KEY_ENV =
  PROVIDER === "openai"
    ? "OPENAI_API_KEY"
    : PROVIDER === "anthropic"
      ? "ANTHROPIC_API_KEY"
      : PROVIDER === "google"
        ? "GEMINI_KEY"
        : PROVIDER === "local"
          ? "LOCAL_API_KEY"
          : "OPENROUTER_API_KEY";
const API_KEY = process.env[KEY_ENV] ?? (PROVIDER === "local" ? "local" : "");
if (!API_KEY) {
  console.error(`${KEY_ENV} not set`);
  process.exit(1);
}

// Reasoning defaults per family; benchmark condition is minimal/none reasoning.
const REASONING = MODEL.includes("gemini")
  ? { effort: "minimal" }
  : MODEL.includes("claude")
    ? { enabled: false }
    : MODEL.includes("gpt-") || MODEL.includes("qwen") || MODEL.includes("kimi")
      ? { effort: "minimal" }
      : undefined;
const REASONING_OVERRIDE =
  process.env.BENCH_REASONING_EFFORT && process.env.BENCH_REASONING_EFFORT !== "none"
    ? { effort: process.env.BENCH_REASONING_EFFORT }
    : null;
const PROVIDER_ORDER = process.env.BENCH_PROVIDER_ORDER?.split(",").map((s) => s.trim());
const MAX_TOKENS = Number(process.env.BENCH_MAX_TOKENS) || 16384;
const REPEATS = Number(process.env.BENCH_REPEATS) || 4;
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY) || 6;
const ONLY = process.env.BENCH_ONLY?.split(",").map((s) => s.trim());
const BRIEFS = ONLY ? SCENARIOS.filter((s) => ONLY.includes(s.name)) : SCENARIOS;

async function generate(
  systemText: string,
  userText: string,
): Promise<{ text: string; truncated: boolean }> {
  const body =
    PROVIDER === "anthropic"
      ? {
          // No temperature: the Anthropic API rejects setting it for this model
          // generation ("deprecated"); it runs at the model default.
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemText,
          messages: [{ role: "user", content: userText }],
        }
      : {
          model: MODEL,
          // OpenAI rejects non-default temperature when reasoning is enabled.
          ...(PROVIDER === "openai" &&
          process.env.BENCH_REASONING_EFFORT &&
          process.env.BENCH_REASONING_EFFORT !== "none"
            ? {}
            : { temperature: Number(process.env.BENCH_TEMP) || 0.7 }),
          ...(PROVIDER === "openai"
            ? {
                max_completion_tokens: MAX_TOKENS,
                reasoning_effort: process.env.BENCH_REASONING_EFFORT || "none",
              }
            : {
                max_tokens: MAX_TOKENS,
                ...((REASONING_OVERRIDE ?? REASONING)
                  ? { reasoning: REASONING_OVERRIDE ?? REASONING }
                  : {}),
                ...(PROVIDER_ORDER
                  ? { provider: { order: PROVIDER_ORDER, allow_fallbacks: true } }
                  : {}),
              }),
          messages: [
            { role: "system", content: systemText },
            { role: "user", content: userText },
          ],
        };
  const headers: Record<string, string> =
    PROVIDER === "anthropic"
      ? {
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        }
      : { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Number(process.env.BENCH_TIMEOUT_MS) || 240000),
      });
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }
    const json = await res.json();
    if (!res.ok || json?.error) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 8000 * (attempt + 1)));
        continue;
      }
      throw new Error(json?.error?.message || `HTTP ${res.status}`);
    }
    if (PROVIDER === "anthropic") {
      return {
        text: json.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "",
        truncated: json.stop_reason === "max_tokens",
      };
    }
    return {
      text: json.choices[0]?.message?.content ?? "",
      truncated: json.choices[0]?.finish_reason === "length",
    };
  }
}

// truncated.json per raw dir records generations that hit the output ceiling:
// the only generation-time fact a raw file cannot carry, consumed by score.ts.
function markTruncated(dir: string, id: string) {
  const path = join(dir, "truncated.json");
  const list: string[] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
  if (!list.includes(id)) writeFileSync(path, JSON.stringify([...list, id].sort(), null, 1));
}

type Task = { fmt: string; brief: Brief; r: number; system: string };
const tasks: Task[] = [];
for (const fmt of fmts) {
  const system = FORMATS[fmt].system();
  console.log(`${fmt}: system prompt ${system.length} chars`);
  for (const brief of BRIEFS)
    for (let r = 1; r <= REPEATS; r++) tasks.push({ fmt, brief, r, system });
}
const total = tasks.length;
let done = 0;

async function worker() {
  for (;;) {
    const t = tasks.shift();
    if (!t) return;
    const dir = join(__dirname, "raw", FORMATS[t.fmt].dir);
    mkdirSync(dir, { recursive: true });
    const id = `${t.fmt}__${t.brief.name}__r${t.r}`;
    const file = join(dir, `${id}.txt`);
    const n = ++done;
    if (existsSync(file) && readFileSync(file, "utf8").trim().length > 0) continue;
    try {
      const gen = await generate(t.system, FORMATS[t.fmt].user(t.brief));
      writeFileSync(file, gen.text);
      if (gen.truncated) markTruncated(dir, id);
      console.log(
        `[${n}/${total}] ${id} ${gen.text.length} chars${gen.truncated ? " (truncated)" : ""}`,
      );
    } catch (e) {
      console.log(`[${n}/${total}] ${id} ERROR ${(e as Error).message}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));
console.log(`done. score with: node score.ts ${LABEL}`);
