"""
Orchestrate Pi calls per sjekkliste seksjon (Spor B).

For each of the 8 sjekkliste seksjoner:
  - Build a focused user prompt (application JSON subset + just that seksjon's skeleton)
  - POST to /experiment/agent-call on the configured port
  - Capture stdout, parse to JSON, extract the seksjon's punkter

Aggregate into one sjekkliste dict and write run-NNN.aggregated.json
(in the single-Pi-call format with a `stdout` key, so evaluate.py can score it).

Per-seksjon raw responses are also saved as run-NNN.section-<sid>.json for debugging.

Usage:
    py scripts\\orchestrate-sections.py --iteration 1 --variant baseline \
        --input examples/applications/julebord-kristiansand.json \
        --system training/experiments/exp-baseline/artifacts/skill-no-guide.md \
        --port 8074 \
        --exp-dir training/experiments/exp-decompose-sections

Variants:
    baseline     small system, no enum cheatsheet, full FlatData per seksjon
    enum         + 5-line enum cheatsheet appended to system prompt
    subset       enum + per-seksjon input subsetting
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants

ENUM_CHEATSHEET = """
## Tillatte status-verdier (bruk EKSAKT en av disse strengene)

- "vurdert_ok"        - kravet er oppfylt
- "vurdert_avslag"    - kravet er ikke oppfylt
- "maa_undersokes"    - mer info trengs
- "ikke_relevant"     - punktet gjelder ikke denne saken
- "ikke_vurdert"      - ikke vurdert enda
"""

ENUM_CHEATSHEET_V2 = """
## Tillatte status-verdier (bruk EKSAKT en av disse strengene)

- "vurdert_ok"        - kravet er oppfylt på grunnlag av søknadsdataene
- "vurdert_avslag"    - kravet er ikke oppfylt
- "maa_undersokes"    - informasjonen finnes ikke i søknaden og må aktivt etterspørres (dokumentasjon mangler, opplysninger må hentes fra annen kilde)
- "ikke_relevant"     - punktet gjelder ikke denne saken (f.eks. arbeidsavtale ved enkeltbevilling/arrangement)
- "ikke_vurdert"      - venter på ekstern uttalelse eller kan ikke vurderes uten den (politi/Skatteetaten/NAV, andre instanser)

Bruk ALDRI andre verdier som "godkjent", "ok", "mangler", "innvilget" – disse er ikke tillatt.
"""

# Per-seksjon hints about which top-level FlatData keys are relevant. Used by
# the `subset` variant to shrink the user prompt.
SEKSJON_INPUT_HINTS: dict[str, list[str]] = {
    "formelle_krav": ["BrukerType", "BevillingsType", "Kommunenummer", "Innsender", "OrganisasjonsInformasjon", "Arrangement", "VedleggsListe"],
    "dokumentasjon": ["BevillingsType", "Arrangement", "Bevillingsansvarlig", "VedleggsListe"],
    "vandel": ["BrukerType", "Innsender", "Bevillingsansvarlig", "PersonerMedInnflytelse"],
    "personkrav": ["Bevillingsansvarlig"],
    "lokalpolitisk": ["Arrangement", "Kommunenummer"],
    "habilitet": ["VedleggsListe", "Arrangement"],
    "gebyr": ["Arrangement", "BevillingsType"],
    "helhetsvurdering": [],  # all of FlatData
}

REQUEST_READ_TIMEOUT_SECONDS = 300


# ---------------------------------------------------------------------------
# IO helpers


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(read_text(path))


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------------------
# Prompt builders


def build_system_prompt(base_system: str, variant: str) -> str:
    if variant == "baseline":
        return base_system
    if variant in ("enum", "subset"):
        return base_system.rstrip() + "\n" + ENUM_CHEATSHEET
    if variant in ("enum-v2", "enum-v2-subset"):
        return base_system.rstrip() + "\n" + ENUM_CHEATSHEET_V2
    return base_system


def subset_flatdata(flat: dict, allowed_keys: list[str]) -> dict:
    if not allowed_keys:
        return flat
    return {k: v for k, v in flat.items() if k in allowed_keys}


def build_seksjon_skeleton(seksjon: dict) -> dict:
    """Convert sjekkliste config seksjon (list punkter) → skeleton with status/merknad placeholders.

    Output shape mirrors gold-checklist (dict-keyed punkter under the seksjon id).
    """
    punkter_dict = {}
    for p in seksjon["punkter"]:
        punkter_dict[p["id"]] = {
            "label": p["label"],
            "status": "ikke_vurdert",
            "merknad": "",
        }
    return {
        "sjekkliste": {
            "seksjoner": [
                {
                    "id": seksjon["id"],
                    "label": seksjon["label"],
                    "punkter": punkter_dict,
                }
            ]
        }
    }


def build_user_prompt(input_flat: dict, seksjon: dict, variant: str) -> str:
    if variant in ("subset", "enum-v2-subset"):
        keys = SEKSJON_INPUT_HINTS.get(seksjon["id"], [])
        used_flat = subset_flatdata(input_flat, keys)
    else:
        used_flat = input_flat

    skeleton = build_seksjon_skeleton(seksjon)

    return (
        "Her er rådata fra søknaden:\n\n"
        "```json\n"
        + json.dumps(used_flat, ensure_ascii=False, indent=2)
        + "\n```\n\n"
        "Her er ÉN seksjon av sjekklisten som skal evalueres. "
        "Oppdater \"status\" og \"merknad\" for hvert punkt basert på søknadsdataene over. "
        "Returner KUN denne ene seksjonen som JSON, uten markdown:\n\n"
        "```json\n"
        + json.dumps(skeleton, ensure_ascii=False, indent=2)
        + "\n```\n"
    )


# ---------------------------------------------------------------------------
# Pi call


def call_agent(port: int, system_prompt: str, user_prompt: str) -> dict:
    url = f"http://localhost:{port}/experiment/agent-call"
    body = json.dumps({"systemPrompt": system_prompt, "userPrompt": user_prompt}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_READ_TIMEOUT_SECONDS) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        return {
            "success": False,
            "stdout": "",
            "errorMessage": f"transport error: {e}",
            "elapsedMs": elapsed_ms,
            "model": None,
            "promptLengths": {"system": len(system_prompt), "user": len(user_prompt)},
        }
    return payload


# ---------------------------------------------------------------------------
# Response parsing + aggregation


def strip_markdown_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        nl = t.find("\n")
        if nl >= 0:
            t = t[nl + 1:]
    if t.endswith("```"):
        t = t[:-3].rstrip()
    return t


def extract_seksjon_punkter(stdout: str, seksjon_id: str) -> tuple[dict | None, str | None]:
    """Pull the punkter dict for `seksjon_id` from a single Pi response.

    Accepts the skeleton shape we asked for ({sjekkliste.seksjoner: [{id, punkter:{...}}]})
    as well as a few common variants the model may emit.
    """
    if not stdout or not stdout.strip():
        return None, "empty output"

    try:
        data = json.loads(strip_markdown_fences(stdout))
    except json.JSONDecodeError as e:
        return None, f"json parse error: {e}"

    if not isinstance(data, dict):
        return None, "root is not an object"

    sjekkliste = data.get("sjekkliste", data)
    if not isinstance(sjekkliste, dict):
        return None, "sjekkliste not a dict"

    # Shape 1: {sjekkliste:{seksjoner:[{id,punkter:{...}}]}}
    seksjoner = sjekkliste.get("seksjoner")
    if isinstance(seksjoner, list):
        for s in seksjoner:
            if isinstance(s, dict) and s.get("id") == seksjon_id:
                punkter = s.get("punkter")
                if isinstance(punkter, dict):
                    return punkter, None
                if isinstance(punkter, list):
                    return {p.get("id", f"p{i}"): {k: v for k, v in p.items() if k != "id"} for i, p in enumerate(punkter) if isinstance(p, dict)}, None
        # Fallback: take first item even if id doesn't match
        if seksjoner and isinstance(seksjoner[0], dict):
            punkter = seksjoner[0].get("punkter")
            if isinstance(punkter, dict):
                return punkter, "id mismatch, used first seksjon"

    # Shape 2: {sjekkliste:{<sid>:{punkter:{...}}}}
    if seksjon_id in sjekkliste and isinstance(sjekkliste[seksjon_id], dict):
        punkter = sjekkliste[seksjon_id].get("punkter")
        if isinstance(punkter, dict):
            return punkter, None

    # Shape 3: bare {punkter:{...}}
    if isinstance(sjekkliste.get("punkter"), dict):
        return sjekkliste["punkter"], None

    return None, "no seksjon punkter found"


def build_skeleton_punkter(seksjon: dict) -> dict:
    """Skeleton used to fill in when the model fails for that seksjon."""
    return {
        p["id"]: {"label": p["label"], "status": "ikke_vurdert", "merknad": "(no model output)"}
        for p in seksjon["punkter"]
    }


# ---------------------------------------------------------------------------
# Orchestrator


def orchestrate(args: argparse.Namespace) -> int:
    repo_root = Path(args.exp_dir).resolve()
    exp_dir = repo_root
    runs_dir = exp_dir / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)

    input_path = Path(args.input).resolve()
    if not input_path.is_absolute() or not input_path.exists():
        # Try repo-relative to the worktree augmenter-agent root
        agent_root = Path(__file__).resolve().parent.parent
        input_path = (agent_root / args.input).resolve()
    if not input_path.exists():
        print(f"ERROR: input file not found: {input_path}", file=sys.stderr)
        return 2

    sjekkliste_cfg_path = Path(args.sjekkliste).resolve()
    if not sjekkliste_cfg_path.exists():
        agent_root = Path(__file__).resolve().parent.parent
        sjekkliste_cfg_path = (agent_root / args.sjekkliste).resolve()

    system_base_path = Path(args.system).resolve()
    if not system_base_path.exists():
        agent_root = Path(__file__).resolve().parent.parent
        system_base_path = (agent_root / args.system).resolve()

    sjekkliste_cfg = read_json(sjekkliste_cfg_path)
    application = read_json(input_path)
    flat = application.get("FlatData", application)
    base_system = read_text(system_base_path)

    system_prompt = build_system_prompt(base_system, args.variant)

    seksjoner = sjekkliste_cfg["seksjoner"]
    run_id = f"run-{args.iteration:03d}"

    print(f"[orchestrate] {run_id} variant={args.variant} seksjoner={len(seksjoner)} system={len(system_prompt)} chars")

    aggregated_seksjoner: dict[str, dict] = {}
    per_section_records: list[dict] = []
    total_started = time.monotonic()

    for idx, seksjon in enumerate(seksjoner, start=1):
        sid = seksjon["id"]
        user_prompt = build_user_prompt(flat, seksjon, args.variant)
        print(f"  [{idx}/{len(seksjoner)}] {sid:18s} user={len(user_prompt):5d} chars  ", end="", flush=True)

        call_started = time.monotonic()
        result = call_agent(args.port, system_prompt, user_prompt)
        call_elapsed_ms = int((time.monotonic() - call_started) * 1000)

        stdout = result.get("stdout") or ""
        punkter, parse_err = extract_seksjon_punkter(stdout, sid)
        if punkter is None:
            print(f"FAIL  {call_elapsed_ms/1000:5.1f}s  err={parse_err}  stdout-len={len(stdout)}")
            punkter = build_skeleton_punkter(seksjon)
            status = "fail"
        else:
            print(f"ok    {call_elapsed_ms/1000:5.1f}s  punkter={len(punkter)}")
            status = "ok"

        aggregated_seksjoner[sid] = {
            "label": seksjon["label"],
            "punkter": punkter,
        }

        per_section_record = {
            "iteration": args.iteration,
            "variant": args.variant,
            "seksjon_id": sid,
            "userPromptLength": len(user_prompt),
            "systemPromptLength": len(system_prompt),
            "elapsedMs": result.get("elapsedMs", call_elapsed_ms),
            "wallElapsedMs": call_elapsed_ms,
            "success": result.get("success", False),
            "stdout": stdout,
            "errorMessage": result.get("errorMessage"),
            "parseError": parse_err,
            "model": result.get("model"),
            "status": status,
        }
        per_section_records.append(per_section_record)
        per_path = runs_dir / f"{run_id}.section-{sid}.json"
        write_json(per_path, per_section_record)

    total_elapsed_ms = int((time.monotonic() - total_started) * 1000)

    aggregated_checklist = {"sjekkliste": aggregated_seksjoner}

    # evaluate.py expects {"stdout": "<json string>", ...} so wrap it.
    aggregated_run_record = {
        "iteration": args.iteration,
        "variant": args.variant,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "inputFile": str(input_path).replace("\\", "/"),
        "systemPromptSrc": str(system_base_path).replace("\\", "/"),
        "model": next((r.get("model") for r in per_section_records if r.get("model")), None),
        "totalElapsedMs": total_elapsed_ms,
        "perSectionElapsedMs": [r["wallElapsedMs"] for r in per_section_records],
        "perSectionStatus": [{"sid": r["seksjon_id"], "status": r["status"], "ms": r["wallElapsedMs"]} for r in per_section_records],
        "success": all(r["status"] == "ok" for r in per_section_records),
        "aggregated": aggregated_checklist,
        "stdout": json.dumps(aggregated_checklist, ensure_ascii=False),
    }

    out_path = runs_dir / f"{run_id}.aggregated.json"
    write_json(out_path, aggregated_run_record)

    ok_count = sum(1 for r in per_section_records if r["status"] == "ok")
    print(f"[orchestrate] done. {ok_count}/{len(seksjoner)} seksjoner ok. total={total_elapsed_ms/1000:.1f}s")
    print(f"[orchestrate] wrote {out_path}")
    return 0


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--iteration", type=int, required=True)
    ap.add_argument("--variant", choices=["baseline", "enum", "subset", "enum-v2", "enum-v2-subset"], default="baseline")
    ap.add_argument("--input", default="examples/applications/julebord-kristiansand.json")
    ap.add_argument("--system", default="training/experiments/exp-baseline/artifacts/skill-no-guide.md")
    ap.add_argument("--sjekkliste", default="config/domain/sjekkliste.json")
    ap.add_argument("--port", type=int, default=8074)
    ap.add_argument("--exp-dir", default="training/experiments/exp-decompose-sections")
    return ap.parse_args()


if __name__ == "__main__":
    sys.exit(orchestrate(parse_args()))
