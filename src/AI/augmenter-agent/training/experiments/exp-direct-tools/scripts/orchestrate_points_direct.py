"""Phase 1 — Pi-free baseline.

Replicates Spor C run-010 (orchestrate_points.py + mode=with-rules-and-facts
+ concurrency=3) but replaces the call_pi() shell-out with a direct HTTP
call via SandkasseClient. Everything else (27 rules, MICRO_SYSTEM_PROMPT,
facts, parsing) is re-used unchanged from scripts/orchestrate_points.py.

Goal: prove that removing Pi from the loop does NOT degrade quality.
Success = 100% status-agreement vs gold (Spor C run-010), wall-time ≤15s.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import orchestrate_points as op  # noqa: E402  (deliberate after sys.path manipulation)
from sandkasse_client import SandkasseClient  # noqa: E402


_CLIENT: SandkasseClient | None = None


def _client() -> SandkasseClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = SandkasseClient()
    return _CLIENT


def call_sandkasse_direct(
    port: int,  # ignored — kept for signature compatibility with op.call_pi
    user_prompt: str,
    system_prompt: str,
    timeout_s: int = 120,
) -> dict:
    """Drop-in replacement for orchestrate_points.call_pi.

    Returns the same shape: {success, stdout, errorMessage, elapsedMs}.
    """
    resp = _client().chat(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=4096,
        temperature=0.0,
    )
    if resp.error:
        return {
            "success": False,
            "stdout": "",
            "errorMessage": resp.error,
            "elapsedMs": resp.elapsed_ms,
        }
    return {
        "success": True,
        "stdout": resp.content,
        "errorMessage": None,
        "elapsedMs": resp.elapsed_ms,
    }


# Monkey-patch BEFORE op.orchestrate() is called. orchestrate.py reads
# the symbol op.call_pi at call-time (it's referenced from _do_llm), so
# rebinding it on the module suffices.
op.call_pi = call_sandkasse_direct


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--mode", choices=["llm-only", "with-rules", "with-rules-and-facts"],
                    default="with-rules-and-facts")
    ap.add_argument("--concurrency", type=int, default=3)
    args = ap.parse_args()

    wall_started = time.perf_counter()
    rec = op.orchestrate(
        input_path=args.input,
        port=0,  # not used — monkey-patched call_sandkasse_direct ignores it
        mode=args.mode,
        concurrency=args.concurrency,
        out_path=args.out,
    )
    wall_elapsed = round(time.perf_counter() - wall_started, 2)

    # Augment the written record with wall-time + transport tag
    record_path = args.out
    record = json.loads(record_path.read_text(encoding="utf-8"))
    record["wallTimeSec"] = wall_elapsed
    record["transport"] = "sandkasse-direct-http"
    record["model"] = "sandkasse/telenor:gemma4 (direct HTTP)"
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2),
                           encoding="utf-8")

    print(
        f"mode={rec['mode']} concurrency={rec['concurrency']} "
        f"det={rec['deterministicPunktCount']} llm={rec['llmPunktCount']} "
        f"llm_phase={rec['llmPhaseElapsedSec']}s wall={wall_elapsed}s "
        f"-> {args.out}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
