"""
Render a side-by-side markdown diff of merknader between an experiment run and the gold-standard.

Usage:
    py scripts/diff-merknader.py --run  training/experiments/exp-X/runs/run-001.json \
                                 --gold training/gold-standard/gold-checklist.json \
                                 --out  training/experiments/exp-X/runs/run-001.diff.md

For each punkt that appears in both:
    ## seksjon_id.punkt_id
      Gold (status): <merknad>
      Exp  (status): <merknad>
      [match | mismatch]
"""
import argparse
import json
import sys
from pathlib import Path

# Reuse the parsing logic from evaluate.py
sys.path.insert(0, str(Path(__file__).parent))
from evaluate import flatten_punkter, load_gold_checklist, try_parse_checklist


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True, type=Path)
    ap.add_argument("--gold", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    run = json.loads(args.run.read_text(encoding="utf-8"))
    parsed, err = try_parse_checklist(run.get("stdout", ""))
    if parsed is None:
        args.out.write_text(f"# Run {args.run.name} did not produce parseable JSON\n\n{err}\n",
                            encoding="utf-8")
        print(f"unparseable: {err}")
        return

    gold = load_gold_checklist(args.gold)
    exp_pts = flatten_punkter(parsed)
    gold_pts = flatten_punkter(gold)

    lines = [
        f"# Merknad diff: {args.run.name}",
        "",
        f"- Run: `{args.run}`",
        f"- Gold: `{args.gold}`",
        f"- Model: {run.get('model', '?')}",
        f"- Elapsed: {run.get('elapsedMs', 0)}ms",
        "",
    ]

    for key in sorted(set(gold_pts) | set(exp_pts)):
        g = gold_pts.get(key, {})
        e = exp_pts.get(key, {})
        g_status = g.get("status", "—")
        e_status = e.get("status", "—")
        g_mrk = (g.get("merknad") or "").strip()
        e_mrk = (e.get("merknad") or "").strip()

        status_marker = "✓" if g_status == e_status else "✗"
        only_in = ""
        if key not in gold_pts:
            only_in = "  *(only in run)*"
        elif key not in exp_pts:
            only_in = "  *(only in gold)*"

        lines.append(f"## {key}  {status_marker}{only_in}")
        lines.append(f"- **Gold** ({g_status}): {g_mrk or '_(empty)_'}")
        lines.append(f"- **Exp**  ({e_status}): {e_mrk or '_(empty)_'}")
        lines.append("")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(lines), encoding="utf-8")
    print(f"diff written: {args.out}")


if __name__ == "__main__":
    main()
