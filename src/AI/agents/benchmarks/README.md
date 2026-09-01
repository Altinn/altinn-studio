# Agent quality benchmark

Verifies that changes to the agent still produce the same quality by
running it against a golden dataset in Langfuse and recording a scored
**dataset run** per agent version. Compare runs side-by-side in
Langfuse under *Datasets → Benchmarks/large-pdf → Runs*.

## When to run it

Run a benchmark when you have changed something that could move output
quality, and you want evidence rather than a hunch:

- **Before merging an agent change**: prompts, tools, the loop, model
  or temperature. Name the run after the change so the two columns sit
  next to each other in Langfuse.
- **After a model or SDK bump**, where nothing in our code changed but
  behavior may have.
- **When a rubric or dataset item changes**, to re-baseline what "good"
  means before comparing anything to it.

It is not a test suite: a run costs a full agent workflow per dataset
item (minutes and actor-model tokens), needs the local stack up, and the
numeric scores move a little between runs on identical code. Treat a
single score change as a signal to look, not a verdict, and don't wire
it into CI expecting a clean pass/fail.

For a fast check of one already-built app, skip the benchmark and run
the [preview render check](#preview-render-check) standalone; it needs
no agent run and posts nothing to Langfuse.

## How it works

```
dataset item (goal + attachments + structural rubric)
        │
        ▼
POST /api/agent/start on the local stack ──► agent works ──► pushes altinity_session_<id>
        │                                                          │
        ▼                                                          ▼
poll /api/agent/status until terminal                     clone the session branch
        │                                                          │
        └────────────► deterministic evaluators (repo vs rubric) ◄─┘
                                │
                                ▼
        scores on the workflow trace + dataset-run-item link in Langfuse
```

The committed **repo is the ground truth**: evaluation never
reconstructs the app from trace spans (spans truncate long payloads and
don't carry every file).

## The rubric

The dataset item's `expectedOutput` is a *structural* rubric, not a
file listing, because page IDs, component IDs and data-model names legitimately
differ between correct runs:

```json
{
  "rubric_version": 2,
  "expected_pages": 5,
  "min_input_components": 48,
  "expected_titles": ["Leverandørvirksomhetens navn", "…"],
  "navigation_required": true
}
```

Field titles are matched against the candidate's `resource.nb.json`
values after normalization (case, punctuation, leading "A.1"-style
enumeration), so naming style doesn't matter but missing fields do.

## Scores

| Score | Type | Meaning |
| --- | --- | --- |
| `bench_completed` | boolean | workflow reached `done` with `success` |
| `bench_pages` | boolean | ordered page count matches the rubric |
| `bench_order_integrity` | boolean | `pages.order` ⇔ layout files agree |
| `bench_navigation` | boolean | every ordered page has NavigationButtons/Bar |
| `bench_field_coverage` | 0–1 | fraction of expected field titles present |
| `bench_input_count` | 0–1 | input components vs rubric minimum |
| `bench_texts_bound` | 0–1 | text bindings resolving in resource.nb.json |
| `bench_renders` | boolean | first ordered page renders in app preview (see below) |
| `bench_pages_render` | 0–1 | fraction of ordered pages that render without error |
| `bench_render_fix_rounds` | numeric | fix rounds sent back to the agent (only when a fix ran) |
| `bench_pages_render_after_fix` | 0–1 | render fraction after the fix loop (only when a fix ran) |

## Prerequisites

Work through these once; the run fails fast and unhelpfully if any are
missing.

| # | What | Check |
| --- | --- | --- |
| 1 | Local Designer stack up | `curl -s -o /dev/null -w '%{http_code}' http://studio.localhost` → `200` |
| 2 | Agents service up | `curl -s -o /dev/null -w '%{http_code}' http://localhost:8071/health` |
| 3 | `.env` in this directory | see below |
| 4 | Designer API key minted | `python -m benchmarks.bootstrap_api_key --write-env` |
| 5 | Score configs in Langfuse | `python -m benchmarks.runner ensure-configs` |
| 6 | Playwright + Chromium (render check only) | `pip install -e '.[preview]' && playwright install chromium` |

Re-run **4** after wiping the database volume, and **5** whenever a new
`bench_*` score is added. A score with no config still posts, but
without a data type or range Langfuse cannot aggregate it across runs.

## Usage

The `.env` in this directory (or exported) holds:

```
LANGFUSE_HOST=…  LANGFUSE_PUBLIC_KEY=…  LANGFUSE_SECRET_KEY=…
AGENT_DESIGNER_API_KEY=…            # X-Api-Key for agent API + Gitea proxy
AGENT_BASE_URL=http://localhost:8071
BENCH_REPO_URL=http://gitea-proxy:81/<org>/<app>.git
```

`BENCH_REPO_URL` points at a **disposable app repo you own**. The
benchmark pushes an `altinity_session_*` branch to it per run, so use a
blank test app, not anything you care about. The URL is as the *agent
container* resolves it (`gitea-proxy:81` on the local stack); the org is
derived from the URL path.

`AGENT_DESIGNER_API_KEY` must be a **Designer user API key**. The
gitea-proxy validates it against Designer's userinfo endpoint, so a
Gitea personal access token does NOT work; mint one with
`bootstrap_api_key` (prerequisite 4).

Attachments referenced by dataset items (`metadata.attachments`) live in
`benchmarks/assets/` (gitignored; binary test fixtures don't belong in
the repo).

```bash
# one-time: create the bench_* score configs in Langfuse
python -m benchmarks.runner ensure-configs

# (re)build the rubric from a known-good session branch
git -c 'http.extraHeader=X-Api-Key: <key>' clone --branch altinity_session_<id> \
    http://localhost/repos/<org>/<app>.git /tmp/golden
python -m benchmarks.runner rubric --from-app /tmp/golden \
    --update-item trace-34fddc78028268ea87078ae2d15e1715

# benchmark the current agent build
python -m benchmarks.runner run --run-name agentic-loop-$(git rev-parse --short HEAD)
```

Name runs after the agent version you're testing (`--run-name`); every
run appears in the Langfuse run table with aggregated scores, so a
regression shows up as a column that got worse.

### Reading the results

The runner prints every score as it posts it, which is usually enough to
see what happened. For comparison across versions go to *Datasets →
Benchmarks/large-pdf → Runs* in Langfuse; each run is a column and each
score a row.

Read the boolean scores first. `bench_completed`, `bench_pages`,
`bench_order_integrity`, `bench_navigation` are pass/fail statements
about structure, so a 0 there is a definite regression. The 0–1 scores
move a little run to run on identical code (the model does not produce
byte-identical apps), so compare them as trends across several runs
rather than treating a 0.95 → 0.93 as a regression.

Every score carries a comment naming what was missing or which page
failed. Read it before investigating; it is usually the whole answer.

## Preview render check

The structural evaluators are blind to runtime failures: an unknown
component type or a malformed expression can pass every check and still
crash the form. The preview check closes that gap: it logs into Studio
with headless Chromium, checks out the session branch through the
Designer API with that browser session (mirroring the frontend's
reset/checkout flow), loads the app in Studio's app preview, and
verifies every ordered page renders (`#finishedLoading` present, no
`AltinnError` page, no uncaught exception, no thrown error on the
console). A component with an unknown type is caught by app-frontend:
the page still reports itself loaded and nothing marks the DOM, so an
exception on the console is the only signal that something did not
render. Console output that is not exception-shaped (failed requests,
warnings) is recorded in the score comment without failing the page.

Opt in with `BENCH_PREVIEW_CHECK=1`; without it a benchmark run behaves
exactly as before. When enabled but Playwright or the stack login is
unavailable, the check is skipped with a log line and no render scores.

Setup (once):

```bash
pip install -e '.[preview]'        # or: pip install playwright
playwright install chromium
```

Extra environment (same `.env`):

```
BENCH_STUDIO_USER=localgiteaadmin   # default; needs access to the BENCH_REPO_URL app
BENCH_STUDIO_BASE_URL=http://studio.localhost   # default
BENCH_PREVIEW_CHECK=1               # required; the check is off otherwise
```

The browser logs in once (fake-Ansattporten user picker, no password
locally) and caches the session in
`benchmarks/.playwright-auth.json` (gitignored) for later items and
runs. Checkout and preview both run as that browser user, so the
preview always renders the working copy the check just switched to the
session branch.

Failure containment: `bench_renders` is 1 only when the first ordered
page renders, and `bench_pages_render` is the fraction of pages that
did, so a late failure shows up as a fraction below 1 rather than a
zero. The failing page and an error snippet go in the comment.
Infrastructure problems (Playwright missing, login or checkout failing,
a preview url that cannot select layouts) skip the check with a log
line and post no render scores; the benchmark run itself never fails.

### The agent's own render check

The same engine is available to the agent as a `preview_render_check`
loop tool, so a run can verify its own work after
`commit_session_branch`. It is off unless `PREVIEW_CHECK_ENABLED=true`
is set **in the agent container's environment** (`.env.docker`, then
`docker compose up -d altinity-agents`). Setting it in
`benchmarks/.env` does nothing, because the tool runs inside the agent,
not in the runner.

This changes what the benchmark measures. `bench_pages_render` scores
the app as the agent left it, so with the tool on it reflects an agent
that could see and fix its own render failures. That is a fair thing to
measure, but it is not comparable with a run where the tool was off, so
say which mode a run used in `--run-description`.

### Render-fix loop

When pages fail the render check, the runner sends the failures back
into the **same agent session** (same `session_id`, continuing on the
session branch, with the page names and error snippets in the goal) and
re-checks after the fix workflow finishes. `bench_renders` and
`bench_pages_render` always reflect the state *before* any fix, so runs
stay comparable across agent versions; the after-fix state is scored
separately (`bench_pages_render_after_fix`, `bench_render_fix_rounds`).

Each fix round is a full agent workflow; that's where the cost is
(actor-model tokens and minutes), the render check itself is free.

```
BENCH_RENDER_FIX=1        # enable the fix loop (off by default)
BENCH_RENDER_FIX_ROUNDS=1 # max fix rounds per item (default)
```

## Troubleshooting

**Scores missing from Langfuse after a run that printed them.** The
standalone `python -m benchmarks.preview_check --branch …` only prints
to stdout. Nothing reaches Langfuse; only `runner run` posts scores.

**A new `bench_*` score never appears.** Run `ensure-configs` again;
score configs are created once and adding a score to the code does not
create one.

**`clone of '…' failed` when running the standalone check.**
`BENCH_REPO_URL` holds the URL as the *agent container* resolves it
(`gitea-proxy:81`), which the host cannot reach. Cloning uses
`BENCH_GITEA_CLONE_BASE` instead (default `http://localhost/repos`); set
it if your stack serves repositories elsewhere.

**Every page fails with a login or checkout error.** Delete
`benchmarks/.playwright-auth.json` and re-run; a cached session survives
a stack reset that invalidated it.

**A page renders in the browser but the check calls it failed.** Read
the score comment. A component that cannot render throws but is caught
by app-frontend, so the page looks fine and only the console shows it.
the check fails the page on exception-shaped console output for exactly
this reason.

**`skip <item>: expectedOutput is not a vN rubric`.** The dataset item
predates the current rubric version; rebuild it with `runner rubric
--from-app … --update-item …`.

## Notes

- The Langfuse SDK is deliberately not used: the self-hosted v3 server
  omits fields newer SDK models require. Everything goes through the
  public REST API (`lf_api.py`).
- After the server is upgraded to Langfuse v4: add a managed
  LLM-as-a-judge evaluator on the dataset (it can see
  `{{expected_output}}`), boolean-score-rate alerts, and optionally the
  `langfuse/experiment-action` CI gate.
