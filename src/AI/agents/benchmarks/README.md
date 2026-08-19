# Agent quality benchmark

Verifies that changes to the agent still produce the same quality by
running it against a golden dataset in Langfuse and recording a scored
**dataset run** per agent version. Compare runs side-by-side in
Langfuse under _Datasets → Benchmarks/large-pdf → Runs_.

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

The committed **repo is the ground truth** — evaluation never
reconstructs the app from trace spans (spans truncate long payloads and
don't carry every file).

## The rubric

The dataset item's `expectedOutput` is a _structural_ rubric, not a
file listing — page IDs, component IDs and data-model names legitimately
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

| Score                   | Type    | Meaning                                      |
| ----------------------- | ------- | -------------------------------------------- |
| `bench_completed`       | boolean | workflow reached `done` with `success`       |
| `bench_pages`           | boolean | ordered page count matches the rubric        |
| `bench_order_integrity` | boolean | `pages.order` ⇔ layout files agree           |
| `bench_navigation`      | boolean | every ordered page has NavigationButtons/Bar |
| `bench_field_coverage`  | 0–1     | fraction of expected field titles present    |
| `bench_input_count`     | 0–1     | input components vs rubric minimum           |
| `bench_texts_bound`     | 0–1     | text bindings resolving in resource.nb.json  |

## Usage

Requires the local Designer stack running (`docker compose up` in
`src/Designer`) and a `.env` in this directory (or exported):

```
LANGFUSE_HOST=…  LANGFUSE_PUBLIC_KEY=…  LANGFUSE_SECRET_KEY=…
AGENT_DESIGNER_API_KEY=…            # X-Api-Key for agent API + Gitea proxy
AGENT_BASE_URL=http://localhost:8071
BENCH_REPO_URL=http://gitea-proxy:81/<org>/<app>.git
```

`BENCH_REPO_URL` points at a **disposable app repo you own** — the
benchmark pushes an `altinity_session_*` branch to it per run, so use a
blank test app, not anything you care about. The URL is as the _agent
container_ resolves it (`gitea-proxy:81` on the local stack); the org is
derived from the URL path.

`AGENT_DESIGNER_API_KEY` must be a **Designer user API key** — the
gitea-proxy validates it against Designer's userinfo endpoint, so a
Gitea personal access token does NOT work. For the local stack, mint
one straight into the database (idempotent, survives until the DB
volume is wiped — re-run after a full stack reset):

```bash
python -m benchmarks.bootstrap_api_key --write-env
```

Attachments referenced by dataset items (`metadata.attachments`) live in
`benchmarks/assets/` (gitignored — binary test fixtures don't belong in
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

## Notes

- The Langfuse SDK is deliberately not used — the self-hosted v3 server
  omits fields newer SDK models require. Everything goes through the
  public REST API (`lf_api.py`).
- After the server is upgraded to Langfuse v4: add a managed
  LLM-as-a-judge evaluator on the dataset (it can see
  `{{expected_output}}`), boolean-score-rate alerts, and optionally the
  `langfuse/experiment-action` CI gate.
