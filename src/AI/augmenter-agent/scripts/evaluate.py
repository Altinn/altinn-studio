"""
Score a single experiment run against the gold-standard checklist.

Usage:
    py scripts/evaluate.py --run training/experiments/exp-X/runs/run-001.json \
                           --gold training/gold-standard/response.json \
                           --out  training/experiments/exp-X/runs/run-001.score.json

Layer 1 (validity, hard pass/fail):
    - Output is non-empty
    - Parses as JSON
    - Has top-level "sjekkliste" key
    - Has all expected sections (matched against gold by id)
    - Every punkt has status + merknad
    - status values are in the allowed enum

Layer 2 (structural match vs gold-standard, percentages):
    - Section coverage (% of gold sections present)
    - Point coverage (% of gold points present)
    - Status-agreement (% of points with same status as gold)
    - Merknad-length-ratio (mean len_exp / len_gold per point)

The gold standard is the response.json from /generate. We extract the
checklist JSON from it by base64-decoding the appropriate PDF? No — the
gold checklist JSON is captured separately during the run. For now we
unbundle it from the request to the agent by looking at the saved
intermediate structures, OR we accept a gold.json with the checklist
JSON directly. We do the latter — the gold-standard folder needs a
gold-checklist.json with the structured output the LLM produced.
"""
import argparse
import base64
import json
import re
import sys
from pathlib import Path
from typing import Any

ALLOWED_STATUSES = {"vurdert_ok", "vurdert_avslag", "maa_undersokes", "ikke_relevant", "ikke_vurdert"}


def strip_markdown_fences(text: str) -> str:
    """Mirror DefaultResponseParser.StripMarkdownFences."""
    t = text.strip()
    if t.startswith("```"):
        nl = t.find("\n")
        if nl >= 0:
            t = t[nl + 1:]
    if t.endswith("```"):
        t = t[:-3].rstrip()
    return t


def try_parse_checklist(stdout: str) -> tuple[dict | None, str | None]:
    if not stdout or not stdout.strip():
        return None, "empty output"
    try:
        data = json.loads(strip_markdown_fences(stdout))
    except json.JSONDecodeError as e:
        return None, f"json parse error: {e}"
    if not isinstance(data, dict):
        return None, "root is not an object"
    if "sjekkliste" not in data:
        return None, "missing 'sjekkliste' key"
    return data, None


def load_gold_checklist(gold_path: Path) -> dict:
    """The gold-standard sjekkliste structure. Accepts either:
       - a raw {"sjekkliste": {...}} JSON
       - the full /generate response.json (we then look for an accompanying gold-checklist.json)
    """
    data = json.loads(gold_path.read_text(encoding="utf-8"))
    if "sjekkliste" in data:
        return data
    # If it's a /generate response, we cannot recover the structured checklist
    # from the rendered PDF. Expect a sibling gold-checklist.json.
    sibling = gold_path.parent / "gold-checklist.json"
    if sibling.exists():
        return json.loads(sibling.read_text(encoding="utf-8"))
    raise SystemExit(
        f"Gold file {gold_path} doesn't contain 'sjekkliste' and no sibling gold-checklist.json found. "
        f"Capture a gold checklist JSON first (see scripts/capture-gold-checklist.ps1)."
    )


def flatten_punkter(checklist: dict) -> dict[str, dict]:
    """Return {f'{seksjon_id}.{punkt_id}': {status, merknad, ...}}"""
    out = {}
    sjekkliste = checklist.get("sjekkliste", {})
    seksjoner = sjekkliste.get("seksjoner") or sjekkliste.get("sections") or []
    for s in seksjoner:
        seksjon_id = s.get("id") or s.get("seksjon") or ""
        punkter = s.get("punkter") or s.get("punkt") or s.get("items") or []
        for p in punkter:
            punkt_id = p.get("id") or p.get("punkt") or ""
            key = f"{seksjon_id}.{punkt_id}"
            out[key] = p
    return out


def evaluate(run: dict, gold: dict) -> dict:
    score: dict[str, Any] = {
        "layer1": {},
        "layer2": {},
        "verdict": "fail",
    }

    stdout = run.get("stdout", "")
    parsed, parse_err = try_parse_checklist(stdout)

    score["layer1"]["non_empty"] = bool(stdout.strip())
    score["layer1"]["parses_json"] = parsed is not None
    if parsed is None:
        score["layer1"]["parse_error"] = parse_err
        return score

    score["layer1"]["has_sjekkliste_root"] = True

    exp_points = flatten_punkter(parsed)
    gold_points = flatten_punkter(gold)

    # Sections by id
    exp_sections = {s.get("id"): s for s in parsed.get("sjekkliste", {}).get("seksjoner", [])}
    gold_sections = {s.get("id"): s for s in gold.get("sjekkliste", {}).get("seksjoner", [])}

    missing_sections = sorted(set(gold_sections) - set(exp_sections))
    extra_sections = sorted(set(exp_sections) - set(gold_sections))
    score["layer1"]["sections_missing"] = missing_sections
    score["layer1"]["sections_extra"] = extra_sections

    # Per-punkt structure
    missing_points = sorted(set(gold_points) - set(exp_points))
    points_missing_status = [k for k, v in exp_points.items() if "status" not in v]
    points_missing_merknad = [k for k, v in exp_points.items() if "merknad" not in v]
    bad_statuses = {k: v.get("status") for k, v in exp_points.items()
                    if v.get("status") and v.get("status") not in ALLOWED_STATUSES}

    score["layer1"]["points_missing_from_gold"] = missing_points
    score["layer1"]["points_missing_status"] = points_missing_status
    score["layer1"]["points_missing_merknad"] = points_missing_merknad
    score["layer1"]["points_with_invalid_status"] = bad_statuses

    layer1_pass = (
        not missing_sections
        and not missing_points
        and not points_missing_status
        and not points_missing_merknad
        and not bad_statuses
    )

    # Layer 2
    if gold_sections:
        score["layer2"]["section_coverage_pct"] = round(
            100.0 * len(set(exp_sections) & set(gold_sections)) / len(gold_sections), 1)
    if gold_points:
        score["layer2"]["point_coverage_pct"] = round(
            100.0 * len(set(exp_points) & set(gold_points)) / len(gold_points), 1)

    common = set(exp_points) & set(gold_points)
    if common:
        agreements = sum(1 for k in common
                         if exp_points[k].get("status") == gold_points[k].get("status"))
        score["layer2"]["status_agreement_pct"] = round(100.0 * agreements / len(common), 1)

        ratios = []
        for k in common:
            gold_len = len(str(gold_points[k].get("merknad", "")))
            exp_len = len(str(exp_points[k].get("merknad", "")))
            if gold_len > 0:
                ratios.append(exp_len / gold_len)
        if ratios:
            score["layer2"]["merknad_length_ratio_mean"] = round(sum(ratios) / len(ratios), 2)

    score["verdict"] = "pass" if layer1_pass else "structural_fail"
    return score


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True, type=Path)
    ap.add_argument("--gold", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    run = json.loads(args.run.read_text(encoding="utf-8"))
    gold = load_gold_checklist(args.gold)
    score = evaluate(run, gold)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(score, indent=2, ensure_ascii=False), encoding="utf-8")

    verdict = score["verdict"]
    layer2 = score.get("layer2", {})
    summary_bits = [f"verdict={verdict}"]
    for key in ("point_coverage_pct", "status_agreement_pct", "merknad_length_ratio_mean"):
        if key in layer2:
            summary_bits.append(f"{key}={layer2[key]}")
    print(" ".join(summary_bits))


if __name__ == "__main__":
    main()
