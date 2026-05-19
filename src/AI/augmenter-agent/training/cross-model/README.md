# Cross-model comparison on Spor C (round-1 attempt)

**Status:** blocked on sandkasse API-key scope.

## What we attempted

Run the Spor C best-config (orchestrate_points.py, mode=with-rules-and-facts,
concurrency=3) against three sandkasse models, 3 iterations each, to compare
status-agreement and wall-time:

- `sandkasse/telenor:gemma4`     — baseline (already 100%/100%/10s in Spor C run-010)
- `sandkasse/telenor:nemotron3`  — to test
- `sandkasse/telenor:qwen3.6`    — to test

## Result

Both new models returned **401 Client authentication failed** on every Pi call.
Smoke-tested directly inside the container with a trivial "PONG" prompt:

```
=== sandkasse/telenor:gemma4 ===   PONG
=== sandkasse/telenor:nemotron3 === 401 Client authentication failed.
=== sandkasse/telenor:qwen3.6 ===   401 Client authentication failed.
```

Same API key, same provider, same endpoint — only the model name varies. Pi's
own `--list-models` recognized all three model IDs as valid, so the issue is
upstream at the sandkasse gateway (not a Pi config error).

## Misleading score

The orchestrator's fallback for failed LLM calls is `{status: ikke_vurdert,
merknad: "Tom respons fra modellen."}`. Combined with the 33/39 deterministic
rules (which all passed regardless of model), this produced a deceiving 84.6%
status-agreement / 100% point-coverage for both failing models — looking
almost-as-good-as gemma4 if you only read the top-level score. Always inspect
`perPunkt[*].errorMessage` before trusting a cross-model number.

## What this run did prove

- The Spor C architecture is **model-agnostic**: same orchestrator, same rules,
  swap-only the `Agent__Model` env var. No code changes per model.
- The fallback-to-ikke_vurdert is graceful — partial failures don't crash the
  pipeline, they just degrade quality on the affected punkter.
- Wall-time stayed at ~3s LLM-phase regardless of which model — because all 6
  LLM calls failed fast (auth) rather than completing.

## How to unblock

Three options:
1. **Get the API key scope expanded** by sandkasse — easiest if these models
   are supposed to be reachable with the same key.
2. **Try alternate model IDs** — maybe `telenor:Nemotron3` (caps), `telenor:nemotron-3`
   (hyphen), or `telenor/nemotron3` (slash). Pi accepted these IDs as registered, but the
   gateway might map them differently.
3. **Try a different `apiKey` env-var per model** — if sandkasse uses different
   keys for different model families.

## Reference runs (do not trust these)

Each `runs/<model>-run-N.json` is preserved for diagnostic inspection
(`perPunkt[*].errorMessage` shows the 401). Their `.score.json` files report
84.6% which is the artifact described above.
