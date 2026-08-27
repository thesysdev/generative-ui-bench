// Verdict for one HTML generation.
//
// HTML has no SDK validator to borrow: its shipped renderer is the browser's
// HTML5 parser, which is error-tolerant by specification — it recovers from
// unclosed and misnested tags and renders unknown elements as inert inline
// boxes. So this validator runs the reference implementation of that parser
// (parse5, the parser jsdom ships) and reads its recovery log: every parse
// error the spec makes the parser recover from is markup the model got wrong,
// even though a browser would still paint something. That is the honest
// analogue of the other protocols' "renders as authored" gate, and the
// difference is disclosed: `renderable` is true for anything with an element
// in it, because a browser renders nearly anything.
//
// On top of the parse log, this adds the same shared completeness layer as
// every other protocol: unknown element names (HTML's hallucinated component),
// required-attribute checks on the controls the spec/ARIA require them for, and
// the coverage floor.
import { parseFragment } from "parse5";
import { KNOWN_ELEMENTS } from "./elements.ts";

export type EvalError = { cls: string; detail: string };
export type EvalResult = { renderable: boolean; complete: boolean; n?: number; errs: EvalError[] };

type P5Node = {
  nodeName: string;
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: P5Node[];
};

// Local reasoning models emit thinking inline; API models return it in a
// separate field the bench never sees. Stripping keeps the two paths equivalent.
function stripThink(t: string) {
  return t.includes("</think>") ? t.replace(/^[\s\S]*?<\/think>\s*/, "") : t;
}

// Fenced output: keep the fenced blocks only, so surrounding prose is not
// parsed as text nodes. Mirrors the other protocols' extractors.
function extractHtml(text: string): string {
  const fences = [...text.matchAll(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/g)].map((m) => m[1]);
  return fences.length ? fences.join("\n") : text;
}

// Parse errors that are pure formatting noise in otherwise well-formed markup:
// the spec's recovery is lossless and a browser renders the authored tree.
const IGNORED_PARSE_ERRORS = new Set([
  "duplicate-attribute",
  "non-void-html-element-start-tag-with-trailing-solidus",
  "unexpected-solidus-in-tag",
  "unexpected-character-in-unquoted-attribute-value",
  "missing-semicolon-after-character-reference",
  "unknown-named-character-reference",
  "control-character-reference",
  "noncharacter-character-reference",
  "surrogate-character-reference",
  "abrupt-closing-of-empty-comment",
  "incorrectly-opened-comment",
]);

// Structural recoveries: the browser silently re-parents or drops content, so
// the rendered tree is not the tree the model wrote.
const STRUCTURE_PARSE_ERRORS = new Set([
  "end-tag-without-matching-open-element",
  "unexpected-end-tag",
  "misplaced-start-tag-for-head-element",
  "end-tag-with-attributes",
  "end-tag-with-trailing-solidus",
  "unexpected-token-in-table",
  "unexpected-start-tag-implies-end-tag",
]);

// Elements whose end tag the spec makes optional: leaving them open is legal
// authoring, not a repair, so the balance scan ignores them.
const OPTIONAL_END = new Set([
  "p",
  "li",
  "dt",
  "dd",
  "option",
  "optgroup",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "colgroup",
  "rt",
  "rp",
]);

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

// Author-intent check the spec parser cannot give us: the HTML5 parser recovers
// from unclosed and stray end tags without emitting a parse error, so the only
// way to see markup a browser silently repaired is to scan the tags the model
// actually wrote and check they balance. An unclosed container swallows every
// following sibling into itself; a stray end tag closes something the model did
// not mean to close. Both change the rendered tree.
function tagBalanceErrors(html: string): EvalError[] {
  const errs: EvalError[] = [];
  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  for (const m of html.matchAll(tagRe)) {
    const [, slash, rawName, , selfClose] = m;
    const tag = rawName.toLowerCase();
    if (VOID.has(tag)) continue;
    if (slash) {
      const at = stack.lastIndexOf(tag);
      if (at === -1) {
        errs.push({ cls: "structure-recovered", detail: `stray-close:${tag}` });
        continue;
      }
      for (const open of stack.splice(at).slice(1)) {
        if (!OPTIONAL_END.has(open))
          errs.push({ cls: "structure-recovered", detail: `unclosed:${open}` });
      }
    } else if (!selfClose) {
      stack.push(tag);
    }
  }
  for (const open of stack) {
    if (!OPTIONAL_END.has(open))
      errs.push({ cls: "structure-recovered", detail: `unclosed:${open}` });
  }
  return errs;
}

// HTML's required-field equivalent, kept to attributes the spec itself requires
// or without which the element does not do its job at all: an <img> with no
// alt, an <a> that is not a link, a <label> that labels nothing. Attributes
// with a spec default (input@type) or an authoring convention (th@scope) are
// not counted, so the gate stays comparable to the other protocols' "required
// prop missing" and does not become a linter.
const REQUIRED_ATTRS: Record<string, string[]> = {
  img: ["alt"],
  a: ["href"],
  label: ["for"],
};

// Generic containers carry no semantics, so they do not count toward the
// coverage floor; everything else does, one per element instance, matching the
// other protocols' "components reachable from root".
const GENERIC = new Set(["div", "span", "template"]);

export function evaluate(
  text: string,
  opts: { reqs?: number; truncated?: boolean } = {},
): EvalResult {
  const errs: EvalError[] = [];
  const out: EvalResult = { renderable: false, complete: false, errs };
  const done = (): EvalResult => {
    out.complete = out.renderable && errs.length === 0;
    const reqs = opts.reqs ?? 0;
    if (out.complete && Number.isFinite(out.n) && (out.n as number) < reqs) {
      errs.push({ cls: "coverage-floor", detail: `elements ${out.n} < requirements ${reqs}` });
      out.complete = false;
    }
    return out;
  };

  const html = extractHtml(stripThink(text)).trim();
  if (!html) {
    errs.push({ cls: "malformed-syntax", detail: "empty output" });
    return done();
  }

  const parseErrors: { code: string }[] = [];
  const fragment = parseFragment(html, {
    onParseError: (err: { code: string }) => parseErrors.push(err),
  }) as unknown as P5Node;

  let elements = 0;
  let counted = 0;
  const walk = (node: P5Node) => {
    for (const child of node.childNodes ?? []) {
      const tag = child.tagName;
      if (tag) {
        elements += 1;
        if (!GENERIC.has(tag)) counted += 1;
        if (!KNOWN_ELEMENTS.has(tag)) {
          errs.push({ cls: "hallucinated-component", detail: `<${tag}>` });
        } else {
          const names = new Set((child.attrs ?? []).map((a) => a.name));
          for (const req of REQUIRED_ATTRS[tag] ?? []) {
            // Implicit labels wrap their control; only the standalone form needs @for.
            if (tag === "label" && (child.childNodes ?? []).some((c) => c.tagName)) continue;
            if (!names.has(req)) errs.push({ cls: "required-field", detail: `<${tag}> @${req}` });
          }
        }
      }
      walk(child);
    }
  };
  walk(fragment);

  out.n = counted;
  if (elements === 0) {
    errs.push({ cls: "root-missing", detail: "no element in output" });
    return done();
  }
  out.renderable = true; // a browser renders anything with an element in it

  for (const { code } of parseErrors) {
    if (IGNORED_PARSE_ERRORS.has(code)) continue;
    errs.push({
      cls: STRUCTURE_PARSE_ERRORS.has(code) ? "structure-recovered" : "malformed-syntax",
      detail: code,
    });
  }
  errs.push(...tagBalanceErrors(html));
  if (opts.truncated) errs.push({ cls: "truncation", detail: "hit ceiling" });

  return done();
}
