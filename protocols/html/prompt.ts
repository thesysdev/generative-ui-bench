// Prompt for the html protocol: the control arm. There is no SDK generator and
// no catalog to serialize — HTML's vocabulary is the spec's element set, which
// every model already knows — so the prompt is only the task framing, the same
// rules the other protocols carry, and the same two worked examples.
//
// BENCH_HTML_STYLE selects the styling condition, because it dominates output
// length: "plain" (default) is semantic markup with no styling hooks, the
// floor for HTML output; "tailwind" is utility-class markup, what models emit
// unprompted when asked for a screen.
const RULES = [
  "Emit one HTML fragment and nothing else: no prose, no <html>, <head> or <body> wrapper, no <script>, no <style>, no comments.",
  "Every element you open must be closed, in order. Unclosed and misnested tags are the single most common failure; re-read your output before finishing.",
  "Use only elements from the HTML standard. Custom or invented tag names (<metric-card>, <Chart>) have no definition and render nothing.",
  "Use the semantic element for the job (header, section, table, form, label, button, input, select, ul) rather than nesting generic containers, and label every control.",
  "Charts have no HTML element: render series as a table of labels and values.",
];

const PLAIN_EXAMPLES = [
  `<section>
  <header>
    <h2>Revenue Overview</h2>
    <p>Last 30 days</p>
  </header>
  <p><strong>Status:</strong> On track</p>
  <aside>
    <h3>Refund spike</h3>
    <p>Refunds rose 14% week over week</p>
  </aside>
  <section>
    <h3>Weekly revenue</h3>
    <table>
      <caption>Revenue, orders and refunds</caption>
      <thead>
        <tr><th scope="col">Metric</th><th scope="col">Value</th></tr>
      </thead>
      <tbody>
        <tr><td>Revenue</td><td>$128,400</td></tr>
        <tr><td>Orders</td><td>1,982</td></tr>
        <tr><td>Refunds</td><td>$3,120</td></tr>
      </tbody>
    </table>
    <table>
      <caption>Revenue by week (USD)</caption>
      <thead>
        <tr><th scope="col">Week</th><th scope="col">Revenue</th></tr>
      </thead>
      <tbody>
        <tr><td>W1</td><td>24100</td></tr>
        <tr><td>W2</td><td>30800</td></tr>
        <tr><td>W3</td><td>34600</td></tr>
        <tr><td>W4</td><td>38900</td></tr>
      </tbody>
    </table>
  </section>
  <footer>
    <button type="button">Export CSV</button>
    <button type="button">Share report</button>
  </footer>
</section>`,
  `<section>
  <header>
    <h2>Book a demo</h2>
    <p>Tell us about your team</p>
  </header>
  <form name="demo-request">
    <p>
      <label for="name">Full name</label>
      <input id="name" name="name" type="text" placeholder="Jane Smith" required />
    </p>
    <p>
      <label for="email">Work email</label>
      <input id="email" name="email" type="email" placeholder="jane@company.com" required />
      <small>We only use this to reply</small>
    </p>
    <p>
      <label for="team_size">Team size</label>
      <select id="team_size" name="team_size">
        <option value="" selected>Choose a range</option>
        <option value="1-10">1-10 people</option>
        <option value="11-50">11-50 people</option>
        <option value="51+">51+ people</option>
      </select>
    </p>
    <fieldset>
      <legend>Interested plan</legend>
      <p>
        <input id="plan-cloud" name="plan" type="radio" value="cloud" />
        <label for="plan-cloud">Cloud &mdash; Managed by us</label>
      </p>
      <p>
        <input id="plan-self" name="plan" type="radio" value="self" />
        <label for="plan-self">Self-hosted &mdash; Runs in your infra</label>
      </p>
    </fieldset>
    <p>
      <button type="submit">Request demo</button>
      <button type="reset">Cancel</button>
    </p>
  </form>
</section>`,
];

const TAILWIND_RULE =
  "Style the fragment with Tailwind CSS utility classes on every element. Assume Tailwind is loaded.";

const TAILWIND_EXAMPLES = [
  `<section class="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
  <header class="mb-4 flex items-baseline justify-between">
    <div>
      <h2 class="text-xl font-semibold text-gray-900">Revenue Overview</h2>
      <p class="text-sm text-gray-500">Last 30 days</p>
    </div>
    <span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">On track</span>
  </header>
  <aside class="mb-6 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4">
    <h3 class="text-sm font-semibold text-amber-900">Refund spike</h3>
    <p class="text-sm text-amber-800">Refunds rose 14% week over week</p>
  </aside>
  <table class="w-full text-left text-sm">
    <thead class="border-b border-gray-200 text-gray-500">
      <tr><th scope="col" class="py-2">Metric</th><th scope="col" class="py-2">Value</th></tr>
    </thead>
    <tbody class="divide-y divide-gray-100 text-gray-900">
      <tr><td class="py-2">Revenue</td><td class="py-2">$128,400</td></tr>
      <tr><td class="py-2">Orders</td><td class="py-2">1,982</td></tr>
      <tr><td class="py-2">Refunds</td><td class="py-2">$3,120</td></tr>
    </tbody>
  </table>
  <footer class="mt-6 flex gap-3">
    <button type="button" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Export CSV</button>
    <button type="button" class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Share report</button>
  </footer>
</section>`,
  `<section class="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
  <header class="mb-4">
    <h2 class="text-xl font-semibold text-gray-900">Book a demo</h2>
    <p class="text-sm text-gray-500">Tell us about your team</p>
  </header>
  <form name="demo-request" class="space-y-4">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Full name</label>
      <input id="name" name="name" type="text" placeholder="Jane Smith" required
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
    </div>
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700">Work email</label>
      <input id="email" name="email" type="email" placeholder="jane@company.com" required
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      <small class="text-xs text-gray-500">We only use this to reply</small>
    </div>
    <div>
      <label for="team_size" class="block text-sm font-medium text-gray-700">Team size</label>
      <select id="team_size" name="team_size"
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        <option value="" selected>Choose a range</option>
        <option value="1-10">1-10 people</option>
        <option value="11-50">11-50 people</option>
        <option value="51+">51+ people</option>
      </select>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Request demo</button>
      <button type="reset" class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
    </div>
  </form>
</section>`,
];

export type HtmlStyle = "plain" | "tailwind";

export const htmlStyle = (): HtmlStyle =>
  process.env.BENCH_HTML_STYLE === "tailwind" ? "tailwind" : "plain";

export function systemPrompt(style: HtmlStyle = htmlStyle()): string {
  const rules = style === "tailwind" ? [...RULES, TAILWIND_RULE] : RULES;
  const examples = style === "tailwind" ? TAILWIND_EXAMPLES : PLAIN_EXAMPLES;
  return [
    "You generate user interfaces as HTML.",
    "",
    "Rules:",
    ...rules.map((r, i) => `${i + 1}. ${r}`),
    "",
    "Two complete worked examples of correct output follow.",
    "",
    ...examples.map((e, i) => `Example ${i + 1}:\n${e}`),
  ].join("\n");
}
