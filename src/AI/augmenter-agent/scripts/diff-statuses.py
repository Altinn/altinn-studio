"""Quick diff helper: where does our run disagree with gold on status?"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from evaluate import flatten_punkter, strip_markdown_fences  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    ap.add_argument("--gold", required=True)
    args = ap.parse_args()

    run = json.loads(Path(args.run).read_text(encoding="utf-8"))
    parsed = json.loads(strip_markdown_fences(run["stdout"]))
    gold = json.loads(Path(args.gold).read_text(encoding="utf-8"))

    exp_pts = flatten_punkter(parsed)
    gold_pts = flatten_punkter(gold)

    print(f"{'KEY':50s} {'EXP':20s} GOLD")
    print("-" * 90)
    disagree = 0
    for k in sorted(gold_pts):
        gs = gold_pts[k].get("status", "?")
        es = exp_pts.get(k, {}).get("status", "<missing>")
        marker = "  " if es == gs else "!!"
        if es != gs:
            disagree += 1
        print(f"{marker} {k:48s} {es:20s} {gs}")
    print(f"\nDISAGREE: {disagree}/{len(gold_pts)}")


if __name__ == "__main__":
    main()
