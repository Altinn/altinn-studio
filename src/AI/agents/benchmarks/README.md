# The end to end benchmark

This is the only eval that builds a real app. It does these steps:

1. It runs the agent with tools.
2. The agent pushes a session branch.
3. It loads each page in a browser.
4. It compares the result with a structural rubric and gives scores.

A run takes minutes, not seconds. For this reason, `check` does not run it unless you ask for it.

```bash
python -m benchmarks.runner check --include-e2e
```

## Start here

[EVALS.md](EVALS.md) is the entry point. It gives the manifest, the one command, and the data that
a run records. This page gives the details of the end to end benchmark, because it is the only
eval with real prerequisites.

## When to run it

Run a benchmark after a change that can make the output quality different. The benchmark gives
evidence, not an opinion. Run it at these times:

- **Before you merge an agent change.** This includes changes to prompts, tools, the loop, the
  model or the temperature. Describe the change with `--label`, so that you can find the run
  again.
- **After an update to a model or an SDK.** Our code did not change, but the behavior can change.
- **When a rubric or a dataset item changes.** Make a new baseline for "good" before you compare
  a run with it.

The benchmark is not a test suite, for these reasons:

- A run costs a full agent workflow for each dataset item. This takes minutes and actor-model
  tokens.
- The local stack must run.
- The numeric scores change a little between runs on the same code.

Thus, when one score changes, examine it. Do not think that it is a final decision. Do not
connect the benchmark to CI and expect a clear pass or fail.

To examine one app that is already built, do not run the benchmark. Run the
[preview render check](#preview-render-check) alone. It does not run the agent, and it sends
nothing to Langfuse.

## How it works

`langfuse.run_experiment` controls the run. It runs the items and traces each task. It keeps a
failed item separate from the other items. It records the item scores and links the dataset run.
Our code supplies the task and the scorers.

```
langfuse.run_experiment(dataset items, task=AgentTask, evaluators)
        │
        │  for each item, one at a time
        ▼
POST /api/agent/start on the local stack ──► agent works ──► pushes assistant_<id>
        │                                                          │
        ▼                                                          ▼
poll /api/agent/status until terminal                     clone the session branch
        │                                                          │
        └────────────► deterministic evaluators (repo vs rubric) ◄─┘
                                │
                                ▼
                    scores returned as the task output
                                │
                                ▼
                 item scores on the task trace, in the dataset run
```

Each item has two traces:

- The SDK traces the task on the runner side. The item scores are on this trace.
- The agent is a different service with its own workflow trace. This trace has the LLM calls and
  the judges that Langfuse manages.

The runner gives the agent an experiment context at the start. The agent puts this context on
its trace. The name of the context comes from `--run-name`. The default is the dataset name. The
SDK gives its run the name `<timestamp>-<eval>-<model>-<suffix>`. Thus, the two names are
different.

The runner records only item scores. `run_experiment` gets no evaluators for the full run.

The items run one at a time. An agent run pushes to one repository and uses one browser preview.
Thus, two runs cannot occur at the same time. For e2e, the concurrency is always 1
(`E2E_MAX_CONCURRENCY` in `check.py`). `--max-concurrency` applies only to the other evals.

When the runner cannot score an item, it raises an error. `run_experiment` then records a failed
item. It does not remove the item. This is intentional. The previous runner showed a warning and
continued. Thus, a comparison of five items became a comparison of four items, and nobody saw
it.

The committed **repository is the ground truth**. The evaluation does not build the app again
from trace spans. Spans cut long payloads, and they do not have all files.

## The rubric

The `expectedOutput` of the dataset item is a _structural_ rubric. It is not a list of files,
because page IDs, component IDs and data model names can be different in two correct runs:

```json
{
  "rubric_version": 2,
  "expected_pages": 5,
  "min_input_components": 48,
  "expected_titles": ["Leverandørvirksomhetens navn", "…"],
  "navigation_required": true
}
```

The evaluator compares the field titles with the values in `resource.nb.json`. It uses only the
values that the title bindings of the input components point to. First, it normalizes the text:
case, punctuation, and a number such as "A.1" at the start. A match occurs when one title
contains the other. Thus, the name style has no effect, but a missing field has an effect.

## Scores

| Score                          | Type    | Meaning                                                         |
| ------------------------------ | ------- | --------------------------------------------------------------- |
| `bench_completed`              | boolean | The workflow got to `done` with `success`.                      |
| `bench_pages`                  | boolean | The number of ordered pages is the same as in the rubric.       |
| `bench_order_integrity`        | boolean | `pages.order` and the layout files agree.                       |
| `bench_navigation`             | boolean | Each ordered page has NavigationButtons or NavigationBar.       |
| `bench_field_coverage`         | 0–1     | The fraction of the expected field titles that are present.     |
| `bench_input_count`            | 0–1     | The input components compared with the minimum in the rubric.   |
| `bench_texts_bound`            | 0–1     | The fraction of text bindings that resolve in resource.nb.json. |
| `bench_renders`                | boolean | The first ordered page renders in the app preview (see below).¹ |
| `bench_pages_render`           | 0–1     | The fraction of ordered pages that render without an error.     |
| `bench_render_fix_rounds`      | numeric | The fix rounds sent back to the agent. Only when a fix ran.     |
| `bench_pages_render_after_fix` | 0–1     | The render fraction after the fix loop. Only when a fix ran.    |

¹ The runner does not send this score when it did not measure the first page.

## Prerequisites

Do these steps one time. If one is missing, the run fails quickly, and the error does not help.

| #   | What                                         | Check                                                                    |
| --- | -------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | The local Designer stack runs                | `curl -s -o /dev/null -w '%{http_code}' http://studio.localhost` → `200` |
| 2   | The agents service runs and gives its models | `curl -s http://localhost:8071/health` → `models` is not empty           |
| 3   | A `.env` file is in this directory           | see below                                                                |
| 4   | You have a Designer API key                  | `python -m benchmarks.bootstrap_api_key --write-env`                     |
| 5   | The score configs are in Langfuse            | `python -m benchmarks.runner ensure-configs`                             |
| 6   | Playwright and Chromium (render check only)  | `pip install -e '.[preview]' && playwright install chromium`             |

Check **2** is important. If `/health` does not give `models`, `--include-e2e` stops
immediately. The reason: the runner cannot connect the scores to a model. If `models` is missing,
build the agent image again.

Do step **4** again after you delete the database volume. Do step **5** again after somebody adds
a new `bench_*` score. A score without a config is sent. But without a data type or a range,
Langfuse cannot aggregate it across runs.

## Usage

The `.env` file in this directory (or the exported environment) has these values:

```
LANGFUSE_HOST=…  LANGFUSE_PUBLIC_KEY=…  LANGFUSE_SECRET_KEY=…   # LANGFUSE_BASE_URL is also accepted for the host
AGENT_DESIGNER_API_KEY=…            # X-Api-Key for the agent API and the Gitea proxy
AGENT_BASE_URL=http://localhost:8071
BENCH_REPO_URL=http://gitea-proxy:81/<org>/<app>.git
BENCH_DEVELOPER=benchmark           # default; sent as X-Developer
```

`BENCH_REPO_URL` must point to a **test app repository that you own and can discard**. The
benchmark pushes one `assistant_*` branch to it for each run. Thus, use an empty test app. Do not
use an app that is important to you. Write the URL as the _agent container_ resolves it
(`gitea-proxy:81` on the local stack). The runner gets the organization from the URL path.

`AGENT_DESIGNER_API_KEY` must be a **Designer user API key**. The gitea-proxy validates the key
with the userinfo endpoint of Designer. Thus, a Gitea personal access token does NOT work. Make a
key with `bootstrap_api_key` (prerequisite 4).

The dataset items refer to attachments in `metadata.attachments`. These files are in
`benchmarks/assets/`. Git ignores this directory, because binary test fixtures must not be in the
repository. To use a different directory, use `--assets-dir`.

```bash
# One time: make the bench_* score configs in Langfuse
python -m benchmarks.runner ensure-configs

# Make the rubric (again) from a session branch that you know is good
git -c 'http.extraHeader=X-Api-Key: <key>' clone --branch assistant_<id> \
    http://localhost/repos/<org>/<app>.git /tmp/golden
python -m benchmarks.runner rubric --from-app /tmp/golden \
    --update-item trace-34fddc78028268ea87078ae2d15e1715   # the default --dataset is Benchmarks/forms

# Benchmark the current agent build (add --only Benchmarks/forms to run no other evals)
python -m benchmarks.runner check --include-e2e --label "agentic loop $(git rev-parse --short HEAD)"
```

Use `--label` to describe the change that you test. The runner keeps the label with the run and
in the metadata of the Langfuse run. The runner makes a unique name for the Langfuse run. You
cannot select this name. `--run-name` gives a name only to the experiment context of the agent.
Each agent workflow stops after 30 minutes.

### Read the results

`check` shows the progress for each eval. Then it shows a verdict for each behavior. It saves the
run and writes the report to `benchmarks/reports/workbench.html`.

To compare versions, go to _Datasets → the dataset → Runs_ in Langfuse. Each run is a column.
Each score is a row.

Read the boolean scores first. `bench_completed`, `bench_pages`, `bench_order_integrity` and
`bench_navigation` tell if the structure passes or fails. Thus, a 0 in one of them is a real
regression.

The 0–1 scores change a little between runs on the same code, because the model does not make
the same app each time. Compare these scores as trends across many runs. A change from 0.95 to
0.93 is not a regression.

Each score has a comment. The comment tells what was missing or which page failed. Read it before
you examine more. Usually, it gives the full answer.

## Preview render check

The structural evaluators cannot find runtime failures. For example, an unknown component type or
an incorrect expression can pass all checks, but the form can still crash. The preview check
finds these failures. It does these steps:

1. It logs in to Studio with headless Chromium.
2. It checks out the session branch through the Designer API, with that browser session. This
   copies the reset and checkout steps of the frontend.
3. It loads the app in the app preview of Studio.
4. It makes sure that each ordered page renders.

A page renders when all these conditions are true:

- `#finishedLoading` is present.
- There is no `AltinnError` page.
- There is no uncaught exception.
- The console shows no thrown error.

App-frontend catches a component with an unknown type. The page still tells that it loaded, and
nothing in the DOM shows the problem. Thus, an exception on the console is the only signal that
a component did not render. Other console output, for example failed requests and warnings, goes
into the score comment. It does not make the page fail.

To turn on the check, set `BENCH_PREVIEW_CHECK=1`. Without it, a benchmark run does not change. If
the check is on but Playwright or the login to the stack is not available, the runner does not do
the check. It writes a log line and sends no render scores.

Setup (one time):

```bash
pip install -e '.[preview]'        # or: pip install playwright
playwright install chromium
```

More environment variables (in the same `.env` file):

```
BENCH_STUDIO_USER=localgiteaadmin   # default; must have access to the app in BENCH_REPO_URL
BENCH_STUDIO_BASE_URL=http://studio.localhost   # default
BENCH_PREVIEW_CHECK=1               # necessary; without it, the check is off
```

The browser logs in one time. Locally, it uses the fake-Ansattporten user picker, without a
password. It keeps the session in `benchmarks/.playwright-auth.json` for the next items and runs.
Git ignores this file. The checkout and the preview use the same browser user. Thus, the preview
always renders the working copy on the session branch that the check selected.

Failure containment:

- `bench_renders` is 1 only when the first ordered page renders.
- `bench_pages_render` is the fraction of pages that render. Thus, a failure on a later page gives
  a fraction less than 1, not a zero.
- The comment gives the page that failed and a part of the error.

Some problems are in the infrastructure. Examples are a missing Playwright, a login or checkout
that fails, and a preview URL that cannot select layouts. For these problems, the runner does
not do the check. It writes a log line and sends no render scores. The benchmark run does not
fail.

### The render check of the agent

The agent can use the same engine as the `preview_render_check` loop tool. Thus, a run can verify
its own work after `commit_session_branch`. The tool is off unless `PREVIEW_CHECK_ENABLED=true` is
set **in the environment of the agent container**. Set it in `.env.docker`, then run
`docker compose up -d altinity-agents`. It has no effect in `benchmarks/.env`, because the tool
runs in the agent, not in the runner.

This setting changes what the benchmark measures. `bench_pages_render` gives a score to the app
in the state that the agent left it. When the tool is on, the agent can see its render failures
and correct them. This is a correct thing to measure. But you cannot compare it with a run where
the tool was off. Thus, write the mode of the run in `--label`.

### Render-fix loop

When pages fail the render check, the runner sends the failures back to the **same agent
session**. It uses the same `session_id` and continues on the session branch. The goal gives the
page names and a part of each error. After the fix workflow is complete, the runner does the
check again.

`bench_renders` and `bench_pages_render` always show the state _before_ a fix. Thus, you can
compare runs across agent versions. Different scores show the state after the fix:
`bench_pages_render_after_fix` and `bench_render_fix_rounds`.

Each fix round is a full agent workflow. This is the cost: actor-model tokens and minutes. The
render check itself costs nothing.

```
BENCH_RENDER_FIX=1        # turn on the fix loop (off by default)
BENCH_RENDER_FIX_ROUNDS=1 # the maximum number of fix rounds for each item (default)
```

## Troubleshooting

**The run showed scores, but they are not in Langfuse.** The standalone
`python -m benchmarks.preview_check --branch …` writes only to stdout. It sends nothing to
Langfuse. Only `runner check --include-e2e` records scores.

**A new `bench_*` score does not show.** Run `ensure-configs` again. The runner makes the score
configs one time. When you add a score to the code, it does not make a config.

**`clone of '…' failed` when you run the standalone check.** `BENCH_REPO_URL` has the URL as the
_agent container_ resolves it (`gitea-proxy:81`). The host cannot get to this URL. For the clone,
the check uses `BENCH_GITEA_CLONE_BASE`. The default is `http://localhost/repos`. Set it if your
stack serves the repositories at a different URL.

**Each page fails with a login or checkout error.** Delete `benchmarks/.playwright-auth.json`
and run again. A cached session stays after a stack reset, but the reset makes it incorrect.

**A page renders in the browser, but the check tells that it failed.** Read the score comment. A
component that cannot render throws an error, but app-frontend catches it. Thus, the page looks
correct, and only the console shows the error. For this reason, the check fails the page when
the console shows an exception.

**`item <id> expectedOutput is not a v2 rubric`.** The runner records the item as failed. The
dataset item is older than the current rubric version. Make it again with
`runner rubric --from-app … --update-item …`.

## Notes

- The Langfuse SDK runs the experiments (`run_experiment`) and makes datasets. The item upserts
  and the score configs use the public REST API in `lf_api.py`.
- After the update of the server to Langfuse v4, add these items:
  - a managed LLM-as-a-judge evaluator on the dataset (it can see `{{expected_output}}`)
  - alerts for the rate of boolean scores
  - optionally, the `langfuse/experiment-action` CI gate.
