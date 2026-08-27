// The html arm has no SDK to borrow its verdict from, so its validator is
// tested directly: what the HTML5 parser recovers from silently is exactly what
// these cases pin down.
import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluate } from "../protocols/html/validator.ts";

const classes = (text: string, reqs = 2) => evaluate(text, { reqs }).errs.map((e) => e.cls);

test("well-formed semantic markup is complete", () => {
  const v = evaluate(
    `<section><h2>Revenue</h2><p>$128,400</p><button type="button">Export</button></section>`,
    { reqs: 3 },
  );
  assert.equal(v.renderable, true);
  assert.equal(v.complete, true);
  assert.equal(v.n, 4);
});

test("unclosed container is caught by the balance scan, not the parser", () => {
  const v = evaluate(`<section><h2>Revenue<p>$128,400</p>`, { reqs: 2 });
  assert.equal(v.renderable, true, "a browser still renders it");
  assert.deepEqual(
    v.errs.map((e) => e.detail),
    ["unclosed:section", "unclosed:h2"],
  );
});

test("stray end tag is reported", () => {
  assert.deepEqual(classes(`<section><p>x</p></section></div>`), ["structure-recovered"]);
});

test("invented element names are hallucinated components", () => {
  assert.deepEqual(classes(`<section><metric-card value="3"></metric-card></section>`), [
    "hallucinated-component",
  ]);
});

test("optional end tags and void elements do not count as repairs", () => {
  assert.deepEqual(
    classes(
      `<table><thead><tr><th scope="col">A</th><tbody><tr><td>1</table>` +
        `<form><input type="text" name="a"><br></form>`,
    ),
    [],
  );
});

test("missing required attributes fail", () => {
  assert.deepEqual(classes(`<section><img src="a.png"><a>Pay now</a></section>`), [
    "required-field",
    "required-field",
  ]);
});

test("wrapping labels need no @for", () => {
  assert.deepEqual(classes(`<label>Email<input type="email" name="email"></label>`), []);
});

test("prose around a fenced block is ignored", () => {
  const v = evaluate("Sure:\n```html\n<section><h2>T</h2></section>\n```\nLet me know.", {
    reqs: 2,
  });
  assert.equal(v.complete, true);
});

test("coverage floor applies as for every other protocol", () => {
  assert.deepEqual(classes(`<section><h2>Only this</h2></section>`, 9), ["coverage-floor"]);
});

test("empty and element-free output is not renderable", () => {
  assert.equal(evaluate("").renderable, false);
  assert.equal(evaluate("I cannot help with that.").renderable, false);
});
