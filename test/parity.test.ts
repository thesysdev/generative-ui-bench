// The repo's integrity check as a test: rescoring committed raws must
// reproduce the committed results byte for byte. Runs the openui and
// json-render validators always; a2ui rows join the comparison when
// A2UI_PYTHON points at a working SDK venv (see README).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { scoreLabel, type ResultRow } from "../score.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const committed = (label: string): ResultRow[] =>
  JSON.parse(readFileSync(join(ROOT, "results", `results-${label}.json`), "utf8"));

function assertParity(label: string) {
  const { rows, a2uiComplete } = scoreLabel(label);
  const want = a2uiComplete ? committed(label) : committed(label).filter((r) => r.fmt !== "a2ui");
  assert.equal(
    JSON.stringify(rows, null, 1),
    JSON.stringify(want, null, 1),
    `rescoring ${label} diverged from committed results`,
  );
}

test("openui-only label reproduces byte-identically (inklingsmall)", () => {
  assertParity("inklingsmall");
});

test("three-format label reproduces byte-identically (gemini)", () => {
  assertParity("gemini");
});
