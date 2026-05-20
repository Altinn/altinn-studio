"""Phase 3 — markdown-rules + LLM-driven tool routing.

For each punkt: load the markdown rule, build messages, run a tool-call
loop until the model produces a final {status, merknad} JSON, write a
full trace to traces/<run-id>/<punkt-key>.json.

Hypothesis under test: Gemma 4 31B is smart enough to route
"this is mechanical math → call the tool" vs "this is text judgment →
reason directly" without us having to encode the decision as a DSL.

Usage:
    python orchestrate_tools.py \
        --input ../../../../examples/applications/julebord-kristiansand.json \
        --rules-dir ../rules \
        --out ../runs/tools-run-001.json \
        --punkter personkrav.styrer_alder lokalpolitisk.skjenketider_ok vandel.vandel_styrer
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from sandkasse_client import SandkasseClient  # noqa: E402
from tools import TOOL_DEFINITIONS, dispatch  # noqa: E402


SYSTEM_PROMPT = """Du er en saksbehandler-assistent for kommunale bevillingssaker.

Du får ETT sjekklistepunkt med tilhørende regel (i markdown-format) og hele søknads-JSON.
Din oppgave: vurder dette ene punktet og returner KUN ett JSON-objekt:
{"status": "...", "merknad": "..."}

Status MÅ være EN av:
- vurdert_ok       (vilkåret er bekreftet oppfylt)
- vurdert_avslag   (konkret dokumentert brudd på vilkåret)
- maa_undersokes   (mangler dokumentasjon, eller saksbehandler må undersøke noe)
- ikke_relevant    (punktet gjelder ikke denne søknadstypen)
- ikke_vurdert     (avventer ekstern uttalelse eller manuelle steg)

Du har tilgang til verktøy for deterministiske beregninger (alder, datoer, oppslag, tekst-matching).
Bruk dem AKTIVT når regelen krever beregning eller oppslag — ikke gjett tall eller datoer.
Hvis regelen er ren tekstvurdering uten beregning, svar direkte uten verktøyskall.

Når du har all info du trenger, svar med JSON-objektet og ingenting annet.
Ingen markdown, ingen kommentar utenfor JSON.
"""


JSON_OBJ_RE = re.compile(r"\{.*\}", re.S)


def parse_final_json(text: str) -> dict[str, Any]:
    if not text or not text.strip():
        return {"status": "ikke_vurdert", "merknad": "Tom respons fra modellen."}
    cleaned = text.strip()
    if cleaned.startswith("```"):
        nl = cleaned.find("\n")
        if nl > 0:
            cleaned = cleaned[nl + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    m = JSON_OBJ_RE.search(cleaned)
    if not m:
        return {"status": "ikke_vurdert",
                "merknad": f"Kunne ikke parse JSON. Råtekst: {text[:200]}"}
    snippet = m.group(0)
    for end in range(len(snippet), 0, -1):
        try:
            obj = json.loads(snippet[:end])
            break
        except json.JSONDecodeError:
            continue
    else:
        return {"status": "ikke_vurdert",
                "merknad": f"Ugyldig JSON. Råtekst: {text[:200]}"}
    return {
        "status": obj.get("status") or "ikke_vurdert",
        "merknad": obj.get("merknad") or "",
    }


def run_punkt(
    client: SandkasseClient,
    application: dict,
    rule_text: str,
    punkt_key: str,
    *,
    max_tool_iterations: int = 5,
) -> dict[str, Any]:
    """Run a single punkt through the tool-loop and return a trace + verdict."""
    started = time.perf_counter()

    user_prompt = (
        f"# Sjekklistepunkt: {punkt_key}\n\n"
        f"## Regelen\n\n{rule_text}\n\n"
        f"## Søknad (JSON)\n\n```json\n{json.dumps(application, ensure_ascii=False, indent=2)}\n```\n"
    )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    tool_call_trace: list[dict[str, Any]] = []
    llm_call_trace: list[dict[str, Any]] = []
    final_verdict: dict | None = None
    finish_reason: str | None = None

    for iteration in range(max_tool_iterations):
        resp = client.chat(
            messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            max_tokens=2048,
            temperature=0.0,
        )
        llm_call_trace.append({
            "iteration": iteration,
            "status_code": resp.status_code,
            "elapsed_ms": resp.elapsed_ms,
            "finish_reason": resp.finish_reason,
            "tool_calls_count": len(resp.tool_calls),
            "content_preview": (resp.content or "")[:300],
            "error": resp.error,
            "usage": resp.usage,
        })
        finish_reason = resp.finish_reason

        if resp.error:
            return _build_trace(
                punkt_key, messages, llm_call_trace, tool_call_trace,
                {"status": "ikke_vurdert", "merknad": f"HTTP/transport-feil: {resp.error}"},
                finish_reason, started,
            )

        if not resp.tool_calls:
            final_verdict = parse_final_json(resp.content)
            messages.append({"role": "assistant", "content": resp.content})
            break

        # Model wants to call one or more tools — execute and feed back
        assistant_msg = {
            "role": "assistant",
            "content": resp.content or None,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.name, "arguments": tc.arguments_raw},
                }
                for tc in resp.tool_calls
            ],
        }
        messages.append(assistant_msg)

        for tc in resp.tool_calls:
            tool_started = time.perf_counter()
            result = dispatch(tc.name, tc.arguments, application=application)
            tool_elapsed_ms = int((time.perf_counter() - tool_started) * 1000)
            tool_call_trace.append({
                "iteration": iteration,
                "tool_call_id": tc.id,
                "name": tc.name,
                "arguments": tc.arguments,
                "result": result,
                "elapsed_ms": tool_elapsed_ms,
            })
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
    else:
        # Loop exhausted without final response
        final_verdict = {
            "status": "ikke_vurdert",
            "merknad": f"Maks antall tool-iterasjoner ({max_tool_iterations}) nådd uten endelig svar.",
        }

    return _build_trace(
        punkt_key, messages, llm_call_trace, tool_call_trace,
        final_verdict or {"status": "ikke_vurdert", "merknad": "Ukjent feil"},
        finish_reason, started,
    )


def _build_trace(
    punkt_key: str,
    messages: list[dict],
    llm_call_trace: list[dict],
    tool_call_trace: list[dict],
    final_verdict: dict,
    finish_reason: str | None,
    started: float,
) -> dict[str, Any]:
    total_elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "punkt": punkt_key,
        "final": final_verdict,
        "totalElapsedMs": total_elapsed_ms,
        "llmCallCount": len(llm_call_trace),
        "toolCallCount": len(tool_call_trace),
        "finishReason": finish_reason,
        "llmCalls": llm_call_trace,
        "toolCalls": tool_call_trace,
        "messages": messages,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, type=Path,
                    help="Path to application JSON (e.g. julebord-kristiansand.json)")
    ap.add_argument("--rules-dir", required=True, type=Path,
                    help="Directory containing <punkt-key>.md rule files")
    ap.add_argument("--out", required=True, type=Path,
                    help="Summary output JSON")
    ap.add_argument("--traces-dir", type=Path, default=None,
                    help="Directory to write per-punkt traces (default: ../traces/<run-id>)")
    grp = ap.add_mutually_exclusive_group(required=True)
    grp.add_argument("--punkter", nargs="+",
                     help="Punkt-keys to evaluate (matches <key>.md in rules-dir)")
    grp.add_argument("--all", action="store_true",
                     help="Evaluate every <key>.md in rules-dir")
    ap.add_argument("--concurrency", type=int, default=1,
                    help="Parallel LLM-loops (each punkt is one loop)")
    ap.add_argument("--write-aggregated", type=Path, default=None,
                    help="Optional path to also write Spor-C-shaped aggregated sjekkliste JSON "
                         "(suitable for scripts/evaluate.py)")
    ap.add_argument("--sjekkliste-schema", type=Path, default=None,
                    help="Path to sjekkliste.json (required if --write-aggregated)")
    args = ap.parse_args()

    application = json.loads(args.input.read_text(encoding="utf-8"))
    client = SandkasseClient()

    run_id = args.out.stem
    traces_dir = args.traces_dir or (args.out.parent.parent / "traces" / run_id)
    traces_dir.mkdir(parents=True, exist_ok=True)

    if args.all:
        rule_files = sorted(args.rules_dir.glob("*.md"))
        punkt_keys = [f.stem for f in rule_files]
    else:
        punkt_keys = args.punkter

    def _eval(punkt_key: str) -> dict:
        rule_file = args.rules_dir / f"{punkt_key}.md"
        if not rule_file.is_file():
            return {
                "punkt": punkt_key,
                "skipped": True,
                "reason": f"Rule file not found: {rule_file}",
            }
        rule_text = rule_file.read_text(encoding="utf-8")
        trace = run_punkt(client, application, rule_text, punkt_key)
        (traces_dir / f"{punkt_key}.json").write_text(
            json.dumps(trace, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return {
            "punkt": punkt_key,
            "status": trace["final"]["status"],
            "merknad": trace["final"]["merknad"],
            "llmCallCount": trace["llmCallCount"],
            "toolCallCount": trace["toolCallCount"],
            "toolsUsed": [tc["name"] for tc in trace["toolCalls"]],
            "totalElapsedMs": trace["totalElapsedMs"],
            "finishReason": trace["finishReason"],
        }

    wall_started = time.perf_counter()
    if args.concurrency > 1 and len(punkt_keys) > 1:
        with cf.ThreadPoolExecutor(max_workers=args.concurrency) as ex:
            results = list(ex.map(_eval, punkt_keys))
    else:
        results = [_eval(k) for k in punkt_keys]
    summary_per_punkt = results
    for r in results:
        if r.get("skipped"):
            print(f"  SKIP  {r['punkt']}: {r['reason']}")
        else:
            print(f"  {r['status']:16s}  {r['punkt']:48s}  "
                  f"llm={r['llmCallCount']} tools={r['toolsUsed']}  "
                  f"{r['totalElapsedMs']}ms")

    wall_elapsed = round(time.perf_counter() - wall_started, 2)
    summary = {
        "runId": run_id,
        "timestamp": dt.datetime.now().astimezone().isoformat(),
        "inputFile": str(args.input),
        "tracesDir": str(traces_dir),
        "concurrency": args.concurrency,
        "punkter": summary_per_punkt,
        "wallTimeSec": wall_elapsed,
        "model": "sandkasse/telenor:gemma4",
        "transport": "sandkasse-direct-http + tool-loop",
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, ensure_ascii=False, indent=2),
                        encoding="utf-8")

    if args.write_aggregated:
        if not args.sjekkliste_schema:
            print("ERROR: --write-aggregated requires --sjekkliste-schema", file=sys.stderr)
            return 2
        schema = json.loads(args.sjekkliste_schema.read_text(encoding="utf-8"))
        by_key = {r["punkt"]: r for r in summary_per_punkt if not r.get("skipped")}
        aggregated_sjekkliste: dict[str, dict] = {}
        for s in schema["seksjoner"]:
            section: dict[str, Any] = {"label": s["label"], "punkter": {}}
            for p in s["punkter"]:
                key = f"{s['id']}.{p['id']}"
                hit = by_key.get(key)
                if hit:
                    section["punkter"][p["id"]] = {
                        "label": p["label"],
                        "status": hit["status"],
                        "merknad": hit["merknad"],
                    }
                else:
                    section["punkter"][p["id"]] = {
                        "label": p["label"],
                        "status": schema.get("defaultStatus", "ikke_vurdert"),
                        "merknad": "Ingen markdown-regel for dette punktet.",
                    }
            aggregated_sjekkliste[s["id"]] = section
        agg = {"sjekkliste": aggregated_sjekkliste}
        args.write_aggregated.write_text(json.dumps(agg, ensure_ascii=False, indent=2),
                                         encoding="utf-8")
        # Also write an envelope file with stdout=aggregated_json, suitable for evaluate.py
        envelope_path = args.write_aggregated.with_suffix(".envelope.json")
        envelope_path.write_text(json.dumps({
            "iteration": 0,
            "stdout": json.dumps(agg, ensure_ascii=False, indent=2),
            "success": True,
            "errorMessage": None,
            "model": "sandkasse/telenor:gemma4 (direct + tools)",
            "step": "checklist-agent-direct-tools",
            "wallTimeSec": wall_elapsed,
            "concurrency": args.concurrency,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Aggregated: {args.write_aggregated}")
        print(f"Envelope:   {envelope_path}")

    print(f"\nSummary: {args.out}")
    print(f"Traces:  {traces_dir}/")
    print(f"Wall:    {wall_elapsed}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
