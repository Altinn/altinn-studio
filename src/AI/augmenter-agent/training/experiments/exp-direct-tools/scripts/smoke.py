"""Phase 0 — sandkasse smoketester (direkte HTTP, ingen Pi).

Tre probes:
  1. PONG       — bekrefter base-URL + auth fungerer uten Pi
  2. tools      — bekrefter at /v1/chat/completions godtar `tools`-parameter
                  og returnerer `tool_calls` for et trivielt funksjons-kall
  3. stream     — bekrefter at `stream: true` gir SSE tilbake

Skriptet logger ALDRI API-nøkkelen. Hvis miljø-variabel SANDKASSE_API_KEY
ikke er satt, leses den fra ../../../../.env (samme katalog som compose-fila).

Resultater skrives til SMOKE-RESULTS.md ved siden av dette skriptet.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


GATEWAY_URL = "https://gw.sandkasse.ai/v1/chat/completions"
MODEL = "telenor:gemma4"
TIMEOUT_S = 60


def _load_api_key() -> str:
    key = os.environ.get("SANDKASSE_API_KEY")
    if key:
        return key

    candidates = [
        Path(__file__).resolve().parents[4] / ".env",
        Path.cwd() / ".env",
    ]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, _, value = line.partition("=")
            if name.strip() == "SANDKASSE_API_KEY":
                return value.strip().strip('"').strip("'")

    print("ERROR: SANDKASSE_API_KEY not in env and not found in .env", file=sys.stderr)
    sys.exit(2)


def _post(api_key: str, body: dict, *, want_stream: bool = False) -> tuple[int, dict | str, dict]:
    """Returns (status_code, parsed_body_or_text, response_headers).

    For stream=True we read the raw text — caller verifies SSE shape.
    """
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        GATEWAY_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "Accept": "text/event-stream" if want_stream else "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            raw = resp.read()
            headers = dict(resp.headers.items())
            status = resp.status
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace"), dict(e.headers.items())
    except urllib.error.URLError as e:
        return -1, f"URLError: {e.reason}", {}

    text = raw.decode("utf-8", errors="replace")
    if want_stream:
        return status, text, headers
    try:
        return status, json.loads(text), headers
    except json.JSONDecodeError:
        return status, text, headers


def probe_pong(api_key: str) -> dict[str, Any]:
    started = time.perf_counter()
    status, body, _ = _post(api_key, {
        "model": MODEL,
        "messages": [{"role": "user", "content": "Say PONG and nothing else."}],
        "max_tokens": 32,
        "temperature": 0.0,
    })
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    summary: dict[str, Any] = {"name": "pong", "status_code": status, "elapsed_ms": elapsed_ms}
    if status == 200 and isinstance(body, dict):
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
        summary["content"] = content
        summary["pass"] = "PONG" in content.upper()
    else:
        summary["pass"] = False
        summary["error"] = body if isinstance(body, str) else json.dumps(body)[:500]
    return summary


def probe_tools(api_key: str) -> dict[str, Any]:
    started = time.perf_counter()
    tools = [{
        "type": "function",
        "function": {
            "name": "add_two_numbers",
            "description": "Add two integers and return the sum.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {"type": "integer", "description": "First number"},
                    "b": {"type": "integer", "description": "Second number"},
                },
                "required": ["a", "b"],
            },
        },
    }]
    status, body, _ = _post(api_key, {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a calculator. Use the available tools to compute answers."},
            {"role": "user", "content": "What is 27 plus 15? Use the add_two_numbers tool."},
        ],
        "tools": tools,
        "tool_choice": "auto",
        "max_tokens": 256,
        "temperature": 0.0,
    })
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    summary: dict[str, Any] = {"name": "tools", "status_code": status, "elapsed_ms": elapsed_ms}
    if status == 200 and isinstance(body, dict):
        msg = body.get("choices", [{}])[0].get("message", {}) or {}
        tool_calls = msg.get("tool_calls") or []
        summary["tool_calls_count"] = len(tool_calls)
        summary["first_tool_call"] = tool_calls[0] if tool_calls else None
        summary["content_if_no_tools"] = msg.get("content") or ""
        summary["finish_reason"] = body.get("choices", [{}])[0].get("finish_reason")
        summary["pass"] = len(tool_calls) >= 1 and (
            tool_calls[0].get("function", {}).get("name") == "add_two_numbers"
        )
        summary["verdict"] = (
            "TOOLS_SUPPORTED" if summary["pass"]
            else ("TOOLS_IGNORED" if msg.get("content") else "UNKNOWN")
        )
    elif status == 400:
        summary["pass"] = False
        summary["verdict"] = "TOOLS_REJECTED_400"
        summary["error"] = body if isinstance(body, str) else json.dumps(body)[:500]
    else:
        summary["pass"] = False
        summary["verdict"] = f"HTTP_{status}"
        summary["error"] = body if isinstance(body, str) else json.dumps(body)[:500]
    return summary


def probe_stream(api_key: str) -> dict[str, Any]:
    started = time.perf_counter()
    status, body, headers = _post(api_key, {
        "model": MODEL,
        "messages": [{"role": "user", "content": "Say PONG and nothing else."}],
        "max_tokens": 32,
        "temperature": 0.0,
        "stream": True,
    }, want_stream=True)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    summary: dict[str, Any] = {
        "name": "stream",
        "status_code": status,
        "elapsed_ms": elapsed_ms,
        "content_type": headers.get("Content-Type") or headers.get("content-type"),
    }
    if status == 200 and isinstance(body, str):
        lines = [line for line in body.splitlines() if line.startswith("data:")]
        summary["sse_event_count"] = len(lines)
        summary["first_event"] = lines[0][:200] if lines else None
        summary["last_event"] = lines[-1][:200] if lines else None
        accumulated = []
        for line in lines:
            payload = line[5:].strip()
            if payload == "[DONE]":
                continue
            try:
                evt = json.loads(payload)
                choices = evt.get("choices") or []
                if not choices:
                    continue
                delta = (choices[0].get("delta") or {}).get("content")
                if delta:
                    accumulated.append(delta)
            except json.JSONDecodeError:
                pass
        summary["assembled_content"] = "".join(accumulated)
        summary["pass"] = (
            len(lines) > 0
            and "PONG" in "".join(accumulated).upper()
        )
    else:
        summary["pass"] = False
        summary["error"] = body if isinstance(body, str) else json.dumps(body)[:500]
    return summary


def main() -> int:
    api_key = _load_api_key()
    print(f"sandkasse-smoke: key loaded (len={len(api_key)}, prefix={api_key[:4]}...)")
    print(f"sandkasse-smoke: endpoint={GATEWAY_URL}, model={MODEL}")
    print()

    results = []
    for probe in (probe_pong, probe_tools, probe_stream):
        print(f"--- {probe.__name__} ---")
        r = probe(api_key)
        results.append(r)
        verdict = "PASS" if r.get("pass") else "FAIL"
        print(f"  {verdict}  status={r['status_code']}  {r['elapsed_ms']}ms")
        for k, v in r.items():
            if k in ("name", "status_code", "elapsed_ms", "pass"):
                continue
            sv = str(v)
            if len(sv) > 300:
                sv = sv[:300] + "..."
            print(f"  {k}: {sv}")
        print()

    out_path = Path(__file__).resolve().parent.parent / "SMOKE-RESULTS.md"
    lines = ["# Sandkasse smoke-resultater (Phase 0)", ""]
    lines.append(f"- Endepunkt: `{GATEWAY_URL}`")
    lines.append(f"- Modell: `{MODEL}`")
    lines.append(f"- Kjøretidspunkt: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    for r in results:
        lines.append(f"## {r['name']}")
        lines.append("")
        verdict = "PASS" if r.get("pass") else "FAIL"
        lines.append(f"**Resultat:** {verdict}  ({r['status_code']}, {r['elapsed_ms']}ms)")
        lines.append("")
        lines.append("```json")
        safe = {k: v for k, v in r.items() if k != "pass"}
        lines.append(json.dumps(safe, indent=2, ensure_ascii=False))
        lines.append("```")
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Skrev {out_path}")

    all_pass = all(r.get("pass") for r in results)
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
