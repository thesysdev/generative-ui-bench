import { createRequire } from "node:module";
import { LIBRARY } from "./catalog.ts";

const require = createRequire(import.meta.url);
// Pinned release: the scorer version of record for every committed results file.
// 0.2.15 validates enum and scalar prop values in the parser (#729); results
// scored under the earlier 0.2.11 regime are tagged scorer-v1-lang-core-0.2.11.
const core = require("@openuidev/lang-core");

export type BenchError = { cls: string; detail: string };

export type Verdict = {
  renderable: boolean;
  complete: boolean;
  n: number;
  errs: BenchError[];
};

const parser = core.createParser(LIBRARY.toJSONSchema());

// Local reasoning models emit thinking inline; API models return it in a separate
// field the bench never sees. Stripping keeps the two paths equivalent.
function stripThink(t: string) {
  return t.includes("</think>") ? t.replace(/^[\s\S]*?<\/think>\s*/, "") : t;
}

// The parser validates props itself (0.2.15: required, enum, scalar types);
// the walk only counts the distinct components reachable from root, the
// coverage floor's input.
function countReachable(node: any, seen: Set<any>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => countReachable(n, seen));
  if (node.type === "element" && typeof node.typeName === "string") seen.add(node);
  const props = node.type === "element" ? node.props : node;
  if (props && typeof props === "object")
    for (const v of Object.values(props)) countReachable(v, seen);
}

function evalOpenui(text: string, truncated: boolean): Verdict {
  const out: Verdict = { renderable: false, complete: false, n: 0, errs: [] };
  let r: any;
  try {
    r = parser.parse(text);
  } catch (e: any) {
    out.errs.push({ cls: "malformed-syntax", detail: String(e?.message).slice(0, 60) });
    return out;
  }
  if (!r.root) {
    out.errs.push({ cls: "root-missing", detail: "no root element" });
    return out;
  }
  out.renderable = true;
  // Object literals in typed slots surface as an unresolved ref literally named
  // "undefined". A real dangling reference must appear as a token in the text, so
  // when "undefined" is written nowhere the entry is a parser artifact.
  const hasBareUndefined = /(?<![\w"])undefined(?![\w"])/.test(text);
  for (const u of r.meta.unresolved) {
    if (u === "undefined" && !hasBareUndefined) continue;
    out.errs.push({ cls: "reference-graph", detail: `dangling:${u}` });
  }
  for (const o of r.meta.orphaned) out.errs.push({ cls: "reference-graph", detail: `orphan:${o}` });
  for (const e of r.meta.errors) {
    const cls =
      e.code === "unknown-component"
        ? "hallucinated-component"
        : e.code === "missing-required" || e.code === "null-required"
          ? "required-field"
          : e.code === "excess-args"
            ? "signature-mismatch"
            : e.code === "type-mismatch"
              ? String(e.message ?? "").includes("expects one of")
                ? "enum-mismatch"
                : "signature-mismatch"
              : "other";
    out.errs.push({ cls, detail: `${e.component ?? ""}${e.path ?? ""}` });
  }
  const seen = new Set<any>();
  countReachable(r.root, seen);
  out.n = seen.size; // components reachable from root
  if (truncated) out.errs.push({ cls: "truncation", detail: "hit ceiling" });
  out.complete = out.errs.length === 0;
  return out;
}

// Fences are not stripped here: the parser extracts fenced code itself.
export function evaluate(text: string, opts: { truncated?: boolean; reqs?: number } = {}): Verdict {
  const out = evalOpenui(stripThink(text), opts.truncated === true);
  // Coverage floor: a complete screen must define at least as many components as
  // the brief has requirements, so a trivially small valid output cannot pass.
  if (out.complete && Number.isFinite(out.n) && out.n < (opts.reqs ?? 0)) {
    out.errs.push({
      cls: "coverage-floor",
      detail: `components ${out.n} < requirements ${opts.reqs}`,
    });
    out.complete = false;
  }
  return out;
}
