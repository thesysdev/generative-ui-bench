// API cost of the benchmark runs per model x format at provider list prices:
// sum over runs of (system prompt + brief) input tokens plus output tokens
// from the raws. Per-pass = total / repeats. Thinking models' hidden reasoning
// tokens are not in raws, so real bills run slightly higher.
// Usage: node tools/cost-estimate.ts
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { get_encoding } from "tiktoken";

import { SCENARIOS } from "../briefs/briefs.ts";
import { systemPrompt as openuiPrompt } from "../protocols/openui/prompt.ts";
import { systemPrompt as jrPrompt } from "../protocols/jsonrender/prompt.ts";
import { systemPrompt as htmlPrompt } from "../protocols/html/prompt.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const enc = get_encoding("o200k_base");
const tok = (s: string) => enc.encode(s).length;

const briefTok = Object.fromEntries(SCENARIOS.map((s) => [s.name, tok(s.prompt) + 20]));

const SYS: Record<string, number> = {
  openui: tok(openuiPrompt()),
  jsonrender: tok(jrPrompt()),
  a2ui: tok(readFileSync(join(ROOT, "protocols/a2ui/system-prompt.txt"), "utf8")),
  html: tok(htmlPrompt()),
};

// USD per token (provider list prices).
const PRICE: Record<string, { in: number; out: number }> = {
  gemini: { in: 0.75e-6, out: 3.75e-6 },
  gemini37: { in: 0.75e-6, out: 3.75e-6 },
  sol: { in: 4e-6, out: 20e-6 },
  kimi: { in: 3e-6, out: 15e-6 },
  opus48: { in: 5e-6, out: 25e-6 },
  muse: { in: 1.25e-6, out: 4.25e-6 },
  qwen: { in: 2e-6, out: 6e-6 },
  gemma4a4b: { in: 0.07e-6, out: 0.34e-6 },
  gemma431b: { in: 0.1e-6, out: 0.34e-6 },
  qwen3627b: { in: 0.32e-6, out: 3.2e-6 },
  qwen3635a3b: { in: 0.14e-6, out: 1.0e-6 },
  phi4: { in: 0.07e-6, out: 0.14e-6 },
  ministral8b: { in: 0.15e-6, out: 0.15e-6 },
  granite8b: { in: 0.05e-6, out: 0.1e-6 },
  inkling: { in: 1.0e-6, out: 4.05e-6 },
  inklingsmall: { in: 0.45e-6, out: 1.2e-6 },
};

const money = (x: number) => `$${x.toFixed(2)}`;
let grand = 0;
for (const model of Object.keys(PRICE)) {
  let modelTotal = 0;
  const parts: string[] = [];
  for (const fmt of ["openui", "jsonrender", "a2ui", "html"]) {
    const dir = join(ROOT, "raw", model);
    const files = readdirSync(dir).filter((f) => f.startsWith(`${fmt}__`));
    if (!files.length) continue;
    let inTok = 0;
    let outTok = 0;
    const reps = new Set<string>();
    for (const f of files) {
      const [, scn, rep] = f.match(/^\w+__(.+)__r(\d+)\.txt$/) ?? [];
      if (!scn) continue;
      reps.add(rep);
      inTok += SYS[fmt] + (briefTok[scn] ?? 170);
      outTok += tok(readFileSync(join(dir, f), "utf8"));
    }
    const cost = inTok * PRICE[model].in + outTok * PRICE[model].out;
    modelTotal += cost;
    parts.push(
      `${fmt} ${money(cost)} total / ${money(cost / reps.size)} per pass (${files.length} runs)`,
    );
  }
  grand += modelTotal;
  console.log(`${model}: ${money(modelTotal)}  ->  ${parts.join(" · ")}`);
}
console.log(`TOTAL: ${money(grand)}`);
enc.free();
