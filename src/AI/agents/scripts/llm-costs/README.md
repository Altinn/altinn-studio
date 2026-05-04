# LLM Cost Extraction Scripts

Two NodeJS scripts that fetch LLM cost data from Langfuse and output rows
matching the Studio cost-reporting schema.

Requires Node 20+ (uses native `fetch` and `node:util parseArgs`).

## Environment variables

| Variable              | Description         |
| --------------------- | ------------------- |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key |

Copy from `src/AI/agents/.env`.

## Scripts

### `fetchLlmCosts.js`

Fetch costs for an arbitrary time window.

```bash
node fetchLlmCosts.js \
  --from 2026-04-01T00:00:00Z \
  --to   2026-04-30T23:59:59Z \
  --serviceOwner ttd
```

Options:

- `--from` — start timestamp (ISO 8601, required)
- `--to` — end timestamp (ISO 8601, required)
- `--serviceOwner` — service owner code (optional); matches `userId` on traces.
  When omitted, traces from all service owners in the window are returned and
  bucketed per `(serviceownercode, appName, date)`.

Output is a single JSON array.

### `fetchLastDayLlmCosts.js`

Fetch costs for the previous calendar day (UTC). Designed for the nightly
02:00 run — the window is always the complete yesterday, so re-runs are
deterministic.

```bash
node fetchLastDayLlmCosts.js --serviceOwner ttd
```

Options:

- `--serviceOwner` — service owner code (optional). Same semantics as in
  `fetchLlmCosts.js`.

## Output columns

All rows include the full schema. Columns not derivable from LLM traces are
emitted as `null`.

| Column                   | Value                                         |
| ------------------------ | --------------------------------------------- |
| `date`                   | YYYY-MM-DD of observation                     |
| `year` / `month` / `day` | Parts of `date`                               |
| `serviceownerorgnr`      | _(empty)_                                     |
| `serviceownercode`       | `--serviceOwner` argument                     |
| `messagesender`          | Same as `serviceownercode`                    |
| `serviceresourceid`      | App name from trace `repo_path` (best effort) |
| `serviceresourcetitle`   | _(empty)_                                     |
| `recipienttype`          | _(empty)_                                     |
| `costcenter`             | _(empty)_                                     |
| `messagecount`           | Distinct trace count in bucket                |
| `instancecount`          | Same as `messagecount`                        |
| `databasestoragebytes`   | _(empty)_                                     |
| `attachmentstoragebytes` | _(empty)_                                     |
| `loaded_at`              | Script run timestamp (ISO 8601 UTC)           |
| `source_file`            | `langfuse:<host>`                             |
| `total_cost_usd`         | Summed `calculatedTotalCost`                  |
| `input_tokens`           | Summed input tokens                           |
| `output_tokens`          | Summed output tokens                          |
| `total_tokens`           | Summed total tokens                           |

## Running tests

```bash
node --test aggregate.test.js
```
