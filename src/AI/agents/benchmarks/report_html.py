"""The report as one page."""

from __future__ import annotations

import html
import json
import re

from benchmarks import manifest
from benchmarks.diff import NOISE_FLOOR
from benchmarks.outputs import IDENTIFIER_MAX_CHARS
from benchmarks.report import VERDICT_CLASS, VERDICT_WORDS, Report, shape_of

_BOLD = re.compile(r"\*\*(.+?)\*\*")


def _flat(value: object) -> str:
    if value is None:
        return "not recorded"
    if isinstance(value, dict):
        return ", ".join(f"{k} {v}" for k, v in sorted(value.items())) or "not recorded"
    return str(value)


def _payload(report: Report) -> dict:
    """Everything the page needs, as one JSON blob the script renders from."""
    components = []
    for component in manifest.COMPONENTS:
        views = report.of_component(component.id)
        components.append(
            {
                "id": component.id,
                "name": component.name,
                "where": component.where,
                "does": component.does,
                "worst": report.worst_verdict(component.id),
                "pinned": sum(1 for v in views if v.behavior.is_pinned),
                "total": len(views),
                "verdicts": [v.verdict for v in views],
            }
        )

    behaviors = []
    for view in report.behaviors:
        behavior = view.behavior
        count = view.scored_count
        shapes = {item.item_id: shape_of(item) for item in view.items}
        items = [
            {
                "id": row.item_id,
                "label": row.label,
                "before": row.before,
                "after": row.value,
                "state": row.state,
                "said": row.said,
                "input": row.sent,
                "output": row.answered,
                "expected": row.expected,
                "error": row.error,
                "trace": row.trace_url,
                "seconds": row.seconds,
                "siblings": [
                    {"name": name, "value": value, "said": said}
                    for name, value, said in row.siblings
                ],
                "silent": row.silent,
                "shape": shapes.get(row.item_id),
            }
            for row in view.rows()
        ]
        behaviors.append(
            {
                "id": behavior.id,
                "component": behavior.component,
                "text": behavior.text,
                "checks": behavior.checks,
                "blind": behavior.blind,
                "pinned": behavior.is_pinned,
                "measured_by": behavior.measured_by if behavior.is_pinned else None,
                "metric": view.scale,
                "declared_metric": behavior.metric,
                "misdeclared": view.misdeclared,
                "eval": behavior.eval,
                "issue": behavior.issue,
                "see": list(behavior.see),
                "verdict": view.verdict,
                "verdict_word": VERDICT_WORDS.get(view.verdict, view.verdict),
                "verdict_class": VERDICT_CLASS.get(view.verdict, "unpinned"),
                "baseline": view.baseline,
                "previous": view.previous,
                "current": view.current,
                "delta": view.delta,
                "readings": {
                    "baseline": view.reading(
                        view.baseline, view.scored_in("baseline"), slot="baseline"
                    ),
                    "previous": view.reading(
                        view.previous, view.scored_in("previous"), slot="previous"
                    ),
                    "current": view.reading(view.current, count, slot="current"),
                },
                "items": items,
                "counts": {
                    "items": view.item_count,
                    "scored": view.scored_count,
                    "passed": view.pass_count,
                    "failing": view.fail_count,
                },
                "short_of_full_marks": view.current is not None and view.current < 1.0,
                "breakdowns": [
                    {
                        "dimension": b.dimension,
                        "spread": b.spread,
                        "splits": [
                            {
                                "value": s.value,
                                "scored": s.scored,
                                "passed": s.passed,
                                "mean": s.mean,
                                "reading": s.reading,
                            }
                            for s in b.splits
                        ],
                    }
                    for b in view.breakdowns()
                ],
                "sensitivity": view.sensitivity(),
                "floor_applies": view.floor_applies,
                "coarse": view.coarse,
                "skipped": view.result.skipped if view.result else None,
                "recorded_evaluator": view.result.evaluator if view.result else None,
                "fix": {"kind": behavior.fix.kind, "title": behavior.fix.title},
                "prompt": view.prompt,
            }
        )

    runs = {}
    for key, run in (
        ("baseline", report.baseline),
        ("previous", report.previous),
        ("current", report.current),
    ):
        runs[key] = (
            {
                "label": run.label,
                "name": run.name,
                "recorded": run.provenance.recorded_at,
                "axes": {k: _flat(v) for k, v in run.provenance.axes().items()},
                "notes": list(run.provenance.notes),
            }
            if run
            else None
        )

    return {
        "references": [
            {
                "name": r.name,
                "label": r.label,
                "recorded": r.recorded,
                "kind": r.kind,
                "adopted": r.adopted,
                "axes": r.axes,
                "refused": list(r.refused),
                "counts": r.counts,
                "behaviors": r.behaviors,
                "components": r.components,
                "moved": list(r.moved),
            }
            for r in report.references
        ],
        "adopted_reference": report.baseline.name if report.baseline else None,
        "identifier_max_chars": IDENTIFIER_MAX_CHARS,
        "scored_items": len(
            {row.item_id for view in report.behaviors for row in view.rows()}
        ),
        "verdict_words": VERDICT_WORDS,
        "verdict_class": VERDICT_CLASS,
        "fix_kinds": manifest.FIX_KIND_MEANINGS,
        "generated_at": report.generated_at,
        "noise_floor": NOISE_FLOOR,
        "refused": list(report.comparison.refused) if report.comparison else [],
        "under_test": list(report.current.under_test),
        "duration": report.current.duration_seconds,
        "counts": report.counts(),
        "components": components,
        "behaviors": behaviors,
        "runs": runs,
        "short_of_full_marks": [v.behavior.id for v in report.short_of_full_marks()],
        "unclaimed_evals": list(manifest.evals_with_no_behavior()),
    }


def _prose(text: str, judge: str, run: str) -> str:
    """A small markdown subset, applied to already-escaped text."""
    out = [
        '<section><div class="panel"><div class="panel-head">'
        f"<h3>What {html.escape(judge)} made of the evidence above</h3>"
        '<span class="panel-note">generated prose over the payload for '
        f'{html.escape(run)}, saved beside the run. No score on this page comes '
        "from a model.</span></div>"
        '<div class="prose">'
    ]
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        if block.startswith("#"):
            out.append(f"<h4>{html.escape(block.lstrip('#').strip())}</h4>")
            continue
        safe = html.escape(block)
        safe = _BOLD.sub(lambda m: f"<b>{m.group(1)}</b>", safe)
        out.append(f"<p>{safe}</p>")
    out.append("</div></div></section>")
    return "".join(out)


def render(report: Report, *, judge_note: str | None = None) -> str:
    data = json.dumps(_payload(report), ensure_ascii=False)
    for raw, escaped in (("&", r"\u0026"), ("<", r"\u003c"), (">", r"\u003e")):
        data = data.replace(raw, escaped)
    judge = report.current.provenance.judge or "a model"
    note = _prose(judge_note, judge, report.current.name) if judge_note else ""
    fills = {"__DATA__": data, "__JUDGE__": note}
    return re.sub("|".join(fills), lambda m: fills[m.group(0)], TEMPLATE)


TEMPLATE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Assistant Workbench</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
:root{--bg:#f7f6f3;--panel:#fff;--panel-2:#fbfaf8;--ink:#1a1d21;--ink-2:#4d545c;--muted:#767c85;
--rule:#e3e0d9;--rule-2:#efece6;--accent:#1f4470;--accent-br:#2e6bb0;--hold:#17715b;--moved:#9a6410;
--broken:#a32a20;--unpinned:#8a8f98;--unknown:#4a5a72;--hold-bg:#e8f2ee;--moved-bg:#f8efdd;--broken-bg:#f8e8e5;--unknown-bg:#e7ebf1;
--unpinned-bg:#f0efec;--sans:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;
--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#14161a;--panel:#1b1e23;
--panel-2:#20242a;--ink:#e9e7e2;--ink-2:#b6bcc4;--muted:#8d949d;--rule:#2c3037;--rule-2:#262a30;
--accent:#9dc4ea;--accent-br:#6fa8dc;--hold:#4fbf9a;--moved:#e0a94b;--broken:#e8756a;--unpinned:#7c838c;
--unknown:#8fa6c4;--hold-bg:#14302a;--moved-bg:#33290f;--broken-bg:#351c19;--unpinned-bg:#23262b;
--unknown-bg:#1c232d}}
:root[data-theme=dark]{--bg:#14161a;--panel:#1b1e23;--panel-2:#20242a;--ink:#e9e7e2;--ink-2:#b6bcc4;
--muted:#8d949d;--rule:#2c3037;--rule-2:#262a30;--accent:#9dc4ea;--accent-br:#6fa8dc;--hold:#4fbf9a;
--moved:#e0a94b;--broken:#e8756a;--unpinned:#7c838c;--unknown:#8fa6c4;--hold-bg:#14302a;
--moved-bg:#33290f;--broken-bg:#351c19;--unpinned-bg:#23262b;--unknown-bg:#1c232d}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.5;
-webkit-font-smoothing:antialiased}
img{max-width:100%}[hidden]{display:none!important}
.wrap{max-width:1260px;margin:0 auto;padding:28px 22px 64px}
.eyebrow{font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.14em;
text-transform:uppercase;color:var(--muted)}
header{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;justify-content:space-between;
padding-bottom:16px;border-bottom:1px solid var(--rule)}
h1{font-size:21px;font-weight:600;letter-spacing:-.01em;margin:2px 0 0}
.sources{display:flex;flex-wrap:wrap;gap:6px 14px;font-family:var(--mono);font-size:11.5px;color:var(--muted)}
.sources b{color:var(--ink-2);font-weight:500}
.verdict{border:1px solid var(--rule);border-left:3px solid var(--accent);background:var(--panel);
border-radius:4px;padding:15px 18px;margin-top:22px}
.verdict.refused{border-left-color:var(--broken);background:var(--broken-bg)}
.verdict h2{font-size:15px;font-weight:600;margin:4px 0 6px}
.verdict p{margin:0;color:var(--ink-2);max-width:76ch}
.tally{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.chip{font-family:var(--mono);font-size:11.5px;font-weight:500;padding:3px 9px;border-radius:3px;white-space:nowrap}
.chip.hold{color:var(--hold);background:var(--hold-bg)}.chip.moved{color:var(--moved);background:var(--moved-bg)}
.chip.broken{color:var(--broken);background:var(--broken-bg)}
.chip.unpinned{color:var(--unpinned);background:var(--unpinned-bg)}
.chip.unknown{color:var(--unknown);background:var(--unknown-bg)}
.panel{background:var(--panel);border:1px solid var(--rule);border-radius:4px}
.panel-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:13px 16px;
border-bottom:1px solid var(--rule-2)}
.panel-head h3{font-size:13px;font-weight:600;margin:0}
.panel-note{font-family:var(--mono);font-size:11px;color:var(--muted)}
section{margin-top:26px}
.guide{display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));margin:0}
.guide>div{padding:13px 16px;border-right:1px solid var(--rule-2)}
.guide>div:last-child{border-right:0}
.guide dt{font-size:12.5px;font-weight:600;margin-bottom:3px}
.guide dd{margin:0;font-size:12px;color:var(--muted);line-height:1.45}
.guide dd b{color:var(--ink-2);font-weight:600}
.guide dd code{font-family:var(--mono);font-size:11px}
.guide dd i{font-style:normal;color:var(--ink-2)}
.axis-row{display:grid;grid-template-columns:minmax(0,170px) minmax(0,1fr) minmax(0,1fr) minmax(0,132px);gap:14px;align-items:center;
padding:9px 16px;border-bottom:1px solid var(--rule-2);font-size:12.5px}
.axis-row:last-child{border-bottom:0}.axis-row .name{color:var(--ink-2)}
.axis-row .val{font-family:var(--mono);font-size:12px;color:var(--muted);overflow-wrap:anywhere}
.axis-row.differs .val.a{color:var(--ink)}
.axis-flag{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.07em;
text-transform:uppercase;text-align:right;color:var(--muted)}
.axis-row.differs .axis-flag{color:var(--moved)}
.axis-row.under-test{background:var(--panel-2)}.axis-row.under-test .axis-flag{color:var(--accent)}
.axis-row.blocking .axis-flag{color:var(--broken)}
.legend{display:flex;flex-wrap:wrap;gap:4px 14px;padding:10px 16px;border-bottom:1px solid var(--rule-2);
background:var(--panel-2)}
.legend span{font-family:var(--mono);font-size:10.5px;color:var(--muted);display:inline-flex;align-items:center;gap:6px}
.legend i{width:14px;height:4px;border-radius:2px;flex:none}
.cov{padding:2px 0 6px}
.covrow{display:grid;grid-template-columns:minmax(0,190px) minmax(120px,1fr) 130px 150px;
gap:14px;align-items:center;padding:9px 16px;border-bottom:1px solid var(--rule-2)}
.covrow:last-child{border-bottom:0}
.covrow .cn{font-size:13px;font-weight:600;overflow-wrap:anywhere}
.covrow .cw,.covrow .cp{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;
text-transform:uppercase;color:var(--muted)}
.covrow .cw.hold{color:var(--hold)}.covrow .cw.moved{color:var(--moved)}
.covrow .cw.broken{color:var(--broken)}.covrow .cw.unknown{color:var(--unknown)}
.covrow .cw.unpinned{color:var(--unpinned)}
@media (max-width:820px){.covrow{grid-template-columns:minmax(0,1fr) 130px}.covrow .bars,.covrow .cp{display:none}}
.bars{display:flex;gap:3px;margin-top:8px}
.bar{height:4px;flex:1;border-radius:2px;min-width:6px}
.bar.hold{background:var(--hold)}.bar.moved{background:var(--moved)}.bar.broken{background:var(--broken)}
.bar.unpinned{background:transparent;box-shadow:inset 0 0 0 1px var(--unpinned)}
.bar.unknown{background:var(--unknown-bg);box-shadow:inset 0 0 0 1px var(--unknown)}
.beh{border-bottom:1px solid var(--rule)}.beh:last-child{border-bottom:0}
.beh-head{width:100%;background:none;border:0;font:inherit;color:inherit;text-align:left;
padding:15px 16px 14px;cursor:pointer;display:block}
.beh-head:hover{background:var(--panel-2)}
.beh-head:focus-visible{outline:2px solid var(--accent-br);outline-offset:-2px}
.beh-top{display:grid;grid-template-columns:58px 64px minmax(0,1fr) minmax(0,auto);
gap:14px;align-items:baseline}
.beh-top.solo{grid-template-columns:58px minmax(0,1fr) minmax(0,auto)}
.bscore{font-family:var(--mono);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.bscore.na{color:var(--muted);font-weight:400}
.bdelta{font-family:var(--mono);font-size:11.5px;font-variant-numeric:tabular-nums;text-align:right}
.bdelta.up{color:var(--hold)}.bdelta.down{color:var(--broken)}.bdelta.flat{color:var(--muted)}
@media (max-width:760px){.beh-top{grid-template-columns:58px 64px minmax(0,1fr)}
.beh-top .pill{display:none}.beh-top.solo{grid-template-columns:58px minmax(0,1fr)}}
.beh-text{font-size:14px;font-weight:600}
.pill{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;
padding:3px 8px;border-radius:3px;white-space:nowrap}
.pill.hold{color:var(--hold);background:var(--hold-bg)}.pill.moved{color:var(--moved);background:var(--moved-bg)}
.pill.broken{color:var(--broken);background:var(--broken-bg)}
.pill.unpinned{color:var(--unpinned);background:var(--unpinned-bg)}
.pill.unknown{color:var(--unknown);background:var(--unknown-bg)}
.beh-checks{font-size:12.5px;color:var(--ink-2);margin-top:6px;max-width:82ch;display:block}
.beh-where{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-right:8px}
.intro{background:var(--panel);border:1px solid var(--rule);border-radius:6px;padding:18px 22px 20px}
.intro h2{margin:0 0 8px;font-size:15px;letter-spacing:-.01em}
.intro p{margin:0 0 10px;font-size:13px;color:var(--ink-2);max-width:78ch}
.intro p:last-child{margin-bottom:0}
.intro code{font-family:var(--mono);font-size:11.5px}
.intro-do{color:var(--ink)}
.axisintro{margin:0;padding:0 16px 14px;font-size:12.5px;color:var(--ink-2);max-width:80ch}
.lede{margin:2px 16px 14px;font-size:13px;color:var(--ink-2);max-width:80ch}
.beh-body{padding:0 16px 18px}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1px;background:var(--rule-2);
border:1px solid var(--rule-2);border-radius:4px;overflow:hidden;margin-bottom:14px}
.meta>div{background:var(--panel-2);padding:9px 11px}
.meta dt{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase;
color:var(--muted);margin-bottom:3px}
.meta dd{margin:0;font-size:12.5px;color:var(--ink-2)}
.splits{border:1px solid var(--rule-2);border-radius:4px;margin-bottom:12px;overflow:hidden}
.splits-hd{padding:8px 12px;background:var(--panel-2);border-bottom:1px solid var(--rule-2);
font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;
color:var(--muted)}
.split{padding:9px 12px;border-bottom:1px solid var(--rule-2)}
.split:last-child{border-bottom:0}
.split.notable{background:var(--broken-bg)}
.sname{display:block;font-size:11.5px;color:var(--muted);margin-bottom:5px}
.srow{display:flex;flex-wrap:wrap;gap:6px 18px}
.sp{font-size:12px;color:var(--ink-2)}
.sp b{font-family:var(--mono);font-weight:600;font-variant-numeric:tabular-nums;
margin-left:5px;color:var(--ink)}
.sp em{font-style:normal;font-family:var(--mono);font-size:11px;color:var(--muted);margin-left:5px}
.sp.weakest b,.sp.weakest em{color:var(--broken)}
.snote{display:block;margin-top:6px;font-size:11.5px;color:var(--broken);line-height:1.5}
.where{display:block;margin-top:3px;font-family:var(--mono);font-size:11px;color:var(--muted)}
.refbar{margin:18px 0}
.refsent{margin:0 0 10px;font-size:13px;color:var(--ink-2);max-width:78ch}
.refsent b{color:var(--ink)}
.refbtns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.refbtns .rl{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;
text-transform:uppercase;color:var(--muted);margin-right:2px}
.refbtn{font:inherit;font-size:12px;padding:6px 11px;border:1px solid var(--rule);
border-radius:4px;background:var(--panel);color:var(--ink-2);cursor:pointer;
display:inline-flex;gap:7px;align-items:baseline}
.refbtn:hover{border-color:var(--rule-2);color:var(--ink)}
.refbtn[aria-pressed="true"]{border-color:var(--accent-br);color:var(--ink);
background:var(--panel-2)}
.refbtn em{font-style:normal;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;
text-transform:uppercase;color:var(--muted)}
.refbtn[aria-pressed="true"] em{color:var(--accent-br)}
.refbtn .rd{font-family:var(--mono);font-size:11px;color:var(--muted)}
.axis-row.unknown .axis-flag{color:var(--unknown)}
.same-as{color:var(--muted)}
.fx{display:grid;align-items:baseline;width:100%;padding:8px 12px;background:none;
border:0;border-bottom:1px solid var(--rule-2);text-align:left;font:inherit;color:inherit;cursor:pointer;
grid-template-columns:106px minmax(0,240px) minmax(0,1fr) minmax(0,240px);gap:12px}
.fx:last-child{border-bottom:0}
.fx:hover{background:var(--panel-2)}
.fxb{font-size:11.5px;color:var(--muted)}
.fxgroup{border-bottom:1px solid var(--rule)}
.fxgroup:last-child{border-bottom:0}
.fxhd{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;
color:var(--muted);padding:11px 12px 7px;background:var(--panel-2)}
.fxid{font-family:var(--mono);font-size:11.5px;color:var(--ink);overflow-wrap:anywhere}
.fxsaid{font-size:11.5px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:900px){.fx{grid-template-columns:106px minmax(0,1fr)}
.fxsaid,.fxb{display:none}}
.more{width:100%;padding:9px 12px;background:var(--panel-2);border:0;
border-top:1px solid var(--rule-2);font:inherit;font-size:11.5px;color:var(--muted);
text-align:left;cursor:pointer}
.more:hover{color:var(--ink)}
.note.attrib{margin-top:12px}
.ap-why{font-size:11px;color:var(--muted)}
.axis-hd .name,.axis-hd .val,.axis-hd .axis-flag{font-family:var(--mono);font-size:9.5px;
letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.axis-hd{background:var(--panel-2)}
.ixw{font-style:normal;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;
text-transform:uppercase;margin-left:9px;white-space:nowrap}
.ixw.hold{color:var(--hold)}.ixw.moved{color:var(--moved)}.ixw.broken{color:var(--broken)}
.ixw.unpinned{color:var(--unpinned)}.ixw.unknown{color:var(--unknown)}
.chip.total{color:var(--muted);background:var(--panel-2);border:1px solid var(--rule-2)}
.itemhead{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;
justify-content:space-between;margin:16px 0 7px}
.itemhead h4{margin:0;font-size:12.5px;font-weight:600}
.itemhead span{font-size:11.5px;color:var(--muted)}
.items{border:1px solid var(--rule-2);border-radius:4px;overflow:hidden}
.item{border-bottom:1px solid var(--rule-2)}
.item:last-child{border-bottom:0}
.ihead{display:grid;grid-template-columns:106px minmax(0,auto) minmax(0,1fr) auto 14px;
gap:11px;align-items:baseline;width:100%;padding:9px 12px;background:none;border:0;
text-align:left;font:inherit;color:inherit;cursor:pointer}
.ihead:hover{background:var(--panel-2)}
@media (max-width:760px){.ihead{grid-template-columns:106px minmax(0,1fr) auto 14px}
.ihead .isum{grid-column:1/-1}}
.st{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.08em;
text-transform:uppercase;padding:3px 0;white-space:nowrap}
.st.pass{color:var(--hold)}.st.fail,.st.error{color:var(--broken)}
.st.partial{color:var(--moved)}.st.not-applicable{color:var(--muted)}
.iid{font-family:var(--mono);font-size:11.5px;color:var(--ink);overflow-wrap:anywhere}
.isum{font-size:11.5px;color:var(--muted);line-height:1.5;overflow:hidden;
text-overflow:ellipsis;white-space:nowrap}
.ihead[aria-expanded="true"] .isum{white-space:normal}
.ival{font-family:var(--mono);font-size:12px;font-variant-numeric:tabular-nums;
white-space:nowrap;text-align:right}
.ival .pass{color:var(--hold)}.ival .fail{color:var(--broken)}
.ival .num{color:var(--ink-2)}.ival .na{color:var(--muted)}
.ival .arrow{color:var(--muted);margin:0 4px}
.ichev{width:14px;height:14px;position:relative;top:2px}
.ichev::before{content:"";position:absolute;left:3px;top:3px;width:5px;height:5px;
border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);
transform:rotate(-45deg)}
.ihead[aria-expanded="true"] .ichev::before{transform:rotate(45deg)}
.item.fail,.item.error{background:var(--broken-bg)}
.item.partial{background:var(--moved-bg)}
.item.fail .ihead:hover,.item.partial .ihead:hover,.item.error .ihead:hover{background:none}
.item.not-applicable .iid{color:var(--muted)}
.irec{padding:2px 12px 12px;display:flex;flex-direction:column;gap:9px}
.fld{display:grid;grid-template-columns:minmax(0,148px) minmax(0,1fr);gap:12px;align-items:baseline}
@media (max-width:760px){.fld{grid-template-columns:minmax(0,1fr);gap:3px}}
.fname{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;
color:var(--muted);padding-top:2px}
.fval{font-size:12px;color:var(--ink-2);line-height:1.55;overflow-wrap:anywhere;min-width:0}
.fld.wide .fval{font-family:var(--mono);font-size:11px;background:var(--panel-2);
padding:7px 9px;border-radius:3px;max-height:15em;overflow:auto;white-space:pre-wrap}
.fld.bad .fval{color:var(--broken);font-family:var(--mono);font-size:11px}
.fval a{color:var(--ink-2)}
.sib{display:grid;grid-template-columns:minmax(0,200px) 52px minmax(0,1fr);gap:9px;
align-items:baseline;padding:1px 0}
.sib code{font-family:var(--mono);font-size:11px;color:var(--ink-2)}
.sib b{font-family:var(--mono);font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;
text-align:right;color:var(--ink-2)}
.sib span{font-size:11px;color:var(--muted)}
.stats{display:flex;flex-wrap:wrap;gap:6px 16px;padding:9px 12px;margin-bottom:10px;
border:1px solid var(--rule-2);border-radius:4px;background:var(--panel-2);
font-size:11.5px;color:var(--muted)}
.stats b{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--ink);
font-variant-numeric:tabular-nums}
.stats .ok b{color:var(--hold)}.stats .bad b{color:var(--broken)}.stats .na b{color:var(--muted)}
.sens{font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:12px;padding-left:2px}
.sens.warn{color:var(--moved)}
.why{font-size:11.5px;color:var(--muted);display:block;margin-top:4px;font-family:var(--mono)}
.warnpill{display:inline-block;font-size:11px;color:var(--broken);background:var(--broken-bg);
padding:1px 6px;border-radius:3px;margin-left:4px}
.shape{margin-top:14px;border:1px solid var(--rule-2);border-radius:4px;overflow:hidden}
.shape-head{padding:9px 12px;background:var(--panel-2);border-bottom:1px solid var(--rule-2);
display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline}
.shape-head strong{font-size:12px;font-weight:600}
.shape-head span{font-family:var(--mono);font-size:10.5px;color:var(--muted)}
.shape-head .more{margin-left:auto}
.shape-cols{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--rule-2)}
@media (max-width:760px){.shape-cols{grid-template-columns:1fr}}
.shape-col{background:var(--panel);padding:10px 12px;min-width:0}
.shape-col .lbl{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.09em;
text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.shape-col.gone .lbl{color:var(--broken)}
.shape-col.new .lbl{color:var(--hold)}
.shape-col ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px}
.shape-col li{font-family:var(--mono);font-size:11.5px;line-height:1.45;overflow-wrap:anywhere;
padding:2px 6px;border-radius:3px}
.shape-col.gone li{background:var(--broken-bg);color:var(--broken)}
.shape-col.new li{background:var(--hold-bg);color:var(--hold)}
.shape-col .none{font-family:var(--sans);font-size:12px;color:var(--muted)}
.shape-note{padding:9px 12px;border-top:1px solid var(--rule-2);background:var(--panel-2);
font-size:12px;color:var(--muted)}
.reading{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1px;
background:var(--rule-2);border:1px solid var(--rule-2);border-radius:4px;overflow:hidden}
.reading>div{background:var(--panel);padding:12px 13px;border-top:2px solid var(--hold)}
.reading>div.lim{border-top-color:var(--moved);background:var(--panel-2)}
.reading dt{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase;
color:var(--hold);margin-bottom:5px}
.reading>div.lim dt{color:var(--moved)}
.reading dd{margin:0;font-size:12.5px;color:var(--ink-2);line-height:1.55;max-width:62ch}
.note{margin-top:12px;padding:11px 13px;border-radius:4px;background:var(--panel-2);
border-left:2px solid var(--broken);font-size:12.5px;color:var(--ink-2)}
.ap{margin-top:14px;border:1px solid var(--rule-2);border-radius:4px;overflow:hidden;background:var(--panel-2)}
.ap-bar{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;padding:10px 12px}
.ap-toggle{background:none;border:0;font:inherit;color:var(--ink);cursor:pointer;padding:0;text-align:left;
display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;flex:1 1 auto;min-width:0}
.ap-toggle:focus-visible{outline:2px solid var(--accent-br);outline-offset:2px}
.ap-kind{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
padding:3px 7px;border-radius:3px;white-space:nowrap}
.ap-kind.defect,.ap-kind.regression{color:var(--broken);background:var(--broken-bg)}
.ap-kind.gap,.ap-kind.coverage{color:var(--unpinned);background:var(--unpinned-bg)}
.ap-kind.trust,.ap-kind.investigate,.ap-kind.output-change{color:var(--moved);background:var(--moved-bg)}
.ap-title{font-size:12.5px;font-weight:500;color:var(--ink-2)}
.ap-chev{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-left:auto}
.ap-copy{font-family:var(--mono);font-size:11px;font-weight:500;color:var(--accent);background:var(--panel);
border:1px solid var(--rule);border-radius:4px;padding:5px 10px;cursor:pointer;white-space:nowrap}
.ap-copy:hover{border-color:var(--accent-br);color:var(--accent-br)}
.ap-copy.done{color:var(--hold);border-color:var(--hold)}
.ap pre{margin:0;padding:12px 13px;border-top:1px solid var(--rule-2);background:var(--panel);
font-family:var(--mono);font-size:11.5px;line-height:1.6;color:var(--ink-2);white-space:pre-wrap;overflow-x:auto}
.gap{padding:15px 16px}.gap .beh-text{display:block;margin:6px 0}
.gap p{margin:0;font-size:12.5px;color:var(--muted);max-width:80ch}
.gap code{font-family:var(--mono);font-size:11.5px}
.prose{padding:14px 16px}.prose h4{font-size:12.5px;margin:14px 0 4px}
.prose h4:first-child{margin-top:0}
.prose p{margin:0 0 9px;font-size:12.5px;color:var(--ink-2);max-width:76ch}
.cmd{margin-top:26px;padding:16px 18px;background:var(--panel);border:1px solid var(--rule);border-radius:4px}
.cmd pre{margin:8px 0 0;font-family:var(--mono);font-size:12.5px;overflow-x:auto}
.cmd pre span{color:var(--muted)}
.foot{margin-top:22px;font-size:12px;color:var(--muted);max-width:80ch}
@media (prefers-reduced-motion:no-preference){.beh-head{transition:background .12s ease}}
</style></head><body><div class="wrap">
<header><div><div class="eyebrow">Altinn Studio Assistant &middot; eval workbench</div><h1>Workbench</h1></div>
<div class="sources" id="sources"></div></header>
<section class="intro">
<h2>What this page is</h2>
<p>The Altinn Studio Assistant is an agent that builds Altinn apps from a description in
plain language. This page is the record of one <b>run</b> of its test suite: every
<b>behavior</b> we have written down that the agent must get right, what an automated
check measured for each one, and the individual cases behind every number.</p>
<p>Behaviors are declared in <code>benchmarks/manifest.py</code> and reviewed like code, so
this list is fixed by that file rather than by whichever checks happen to exist. A behavior
nothing checks still appears here, marked <b>nothing measures this</b>, because an untested
part of the agent should read as a gap rather than as silence. Every <b>score</b> runs 0 to
1, and each behavior says how its score was arrived at.</p>
<p class="intro-do">Start with <b>What needs attention</b>. It lists every individual case
that scored below full marks, and each row opens the behavior it came from.</p>
</section>
<div class="refbar" id="refbar"></div>
<div id="verdict"></div>
<section><div class="panel"><div class="panel-head"><h3>Coverage by component</h3>
<span class="panel-note" id="covnote"></span></div>
<div class="legend"><span><i class="bar hold"></i> holding or improved</span>
<span><i class="bar moved"></i> moved, worth a look</span>
<span><i class="bar broken"></i> regressed or failing</span>
<span><i class="bar unknown"></i> ran, but no score to read</span>
<span><i class="bar unpinned"></i> nothing measures this</span></div>
<div class="cov" id="coverage"></div></div></section>
<section><div class="panel"><div class="panel-head"><h3>What needs attention</h3>
<span class="panel-note" id="failnote"></span></div><div id="failures"></div></div></section>
<section><div class="panel"><div class="panel-head"><h3>Every behavior</h3>
<span class="panel-note" id="behnote"></span></div><div id="behaviors"></div></div></section>
__JUDGE__
<section><div class="panel"><div class="panel-head"><h3>The words on this page</h3>
<span class="panel-note">everything above, defined</span></div>
<dl class="guide">
<div><dt>Change</dt><dd>This run's score minus the score of whichever run is selected at the
top. Inside the noise floor it reads as no change. On a small dataset one item can be a large
share of the score, so each behavior states what one item is worth.</dd></div>
<div><dt>Noise floor</dt><dd>How far a score can move between two runs of identical code and
identical models, measured by running exactly that. Movement smaller than this is not
evidence of anything.</dd></div>
<div><dt>Resolution</dt><dd>The smallest change a behavior's score can show, which is one
item divided by the number of items scored. A behavior with seven items cannot resolve
anything finer than 0.143, so its score is coarse and moves in visible jumps.</dd></div>
<div><dt>Naming</dt><dd>A behavior id reads
<code>component.what-it-must-do</code>. A dataset reads <code>Area/name</code>, so
<code>Gates/scope</code> is the dataset for the scope gate. The name beside <i>Items</i> is
the function in the code that produced the score.</dd></div>
</dl>
<dl class="guide" style="border-top:1px solid var(--rule-2)">
<div><dt>Holding</dt><dd>Scored, and did not move past the noise floor. The output may be
worded differently; that is not a change.</dd></div>
<div><dt>Regressed, improved</dt><dd>The score moved. If the behavior's own model did not
change between the runs, the report says so: that movement is variance or a code change, not
evidence about a model.</dd></div>
<div><dt>Moved by one item on an unchanged model</dt><dd>A single item flipped on a behavior
whose model is the same in both runs, on a set too coarse to resolve anything smaller. Real
movement, but not a finding.</dd></div>
<div><dt>Output changed</dt><dd>The score held and the <b>shape</b> of the output moved: a
different field, id, binding, type or option value. Rewording never counts.</dd></div>
<div><dt>Failing</dt><dd>Zero, including when it has always been zero, which a comparison
between two models alone reports as no change.</dd></div>
<div><dt>Ran but scored nothing</dt><dd>The check emitted no score, so its name is wrong or
it is not registered. This is a fault in the test harness, not a verdict about the agent,
which is why it is neither green nor red.</dd></div>
</dl></div></section>
<section><div class="panel"><div class="panel-head"><h3>How the two runs were configured</h3>
<span class="panel-note" id="axisnote"></span></div>
<p class="axisintro">An <b>axis</b> is one thing about a run that could move a score: the
code, the models, the prompts, the dataset, the checks themselves. Every run records all ten.
Seven of them block a comparison outright: if one of those differs and nobody declared it as
the change being tested, a difference in the scores cannot be attributed to anything, and
this page refuses to print deltas rather than guess. Values shown as a short hex string are
digests, so two runs agreeing on one means the underlying text was byte for byte
identical.</p>
<div id="axes"></div></div></section>
<div class="cmd"><div class="eyebrow">How this page was produced</div><pre id="cmd"></pre></div>
<p class="foot" id="foot"></p>
</div>
<script id="data" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById("data").textContent);
const AXIS_LABELS = {code:"Agent code",environment:"Environment",models:"Models by role",
sampling:"Sampling",actor_prompt:"Actor system prompt",prompts:"Prompt versions",
tools:"Tool schemas",dataset:"Dataset version",evaluators:"Evaluator versions",
judge:"Judge model"};
// Emitted from Python so a verdict cannot be worded two ways.
const CLS = D.verdict_class;
const WORD = D.verdict_words;
const KIND = D.fix_kinds;
const esc = t => String(t == null ? "" : t).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"})[c]);
const fmt = v => v == null ? "\u2013" : v.toFixed(3);

// The reference the page is read against; each one is compared in Python.
let refName = (() => {
  const has = name => D.references.some(r => r.name === name);
  if (has(D.adopted_reference)) return D.adopted_reference;
  const prev = D.references.find(r => r.kind === "previous");
  return prev ? prev.name : (D.references.length ? D.references[0].name : null);
})();

function reference() {
  return D.references.find(r => r.name === refName) || null;
}

function absoluteState(b) {
  if (!b.pinned) return {word: "nothing measures this", cls: "unpinned"};
  if (b.current == null) return {word: "ran, no score", cls: "unknown"};
  return b.current >= 1
    ? {word: "every item passes", cls: "hold"}
    : {word: "below full marks", cls: "broken"};
}

function manifestName(id) {
  const c = D.components.find(x => x.id === id);
  return c ? c.name : id;
}

function withRef(b) {
  const r = reference();
  const o = r && r.behaviors[b.id];
  if (!o) {
    const verdict = b.pinned ? "new" : b.verdict;
    return Object.assign({}, b, {
      baseline: null, delta: null, verdict: verdict,
      verdict_word: WORD[verdict] || verdict,
      verdict_class: CLS[verdict] || "unpinned",
      evidence: [], prompt: b.prompt,
      readings: Object.assign({}, b.readings, {baseline: "no reference selected"}),
      items: b.items.map(i => Object.assign({}, i, {before: null, shape: null})),
    });
  }
  return Object.assign({}, b, {
    baseline: o.baseline,
    delta: o.delta,
    verdict: o.verdict,
    verdict_word: o.verdict_word,
    verdict_class: o.verdict_class,
    evidence: o.evidence,
    prompt: o.prompt,
    readings: Object.assign({}, b.readings, {baseline: o.reading}),
    items: b.items.map(i => {
      const per = o.items[i.id] || {};
      return Object.assign({}, i, {before: per.before ?? null, shape: per.shape || null});
    }),
  });
}

function tally(counts) {
  const chips = [
    ["hold", counts.holding, "holding"],
    ["moved", counts.moved, "moved"],
    ["moved", counts.variance, "moved by one item"],
    ["broken", counts.failing, "failing"],
    ["unknown", counts.no_score, "ran but scored nothing"],
    ["unknown", counts.not_run, "not run"],
    ["unknown", counts.recorded, "recorded, nothing to compare"],
    ["unpinned", counts.unpinned, "nothing measures these"],
  ].filter(c => c[1]);
  const shown = chips.reduce((n, c) => n + c[1], 0);
  return '<div class="tally">' +
    chips.map(c => '<span class="chip ' + c[0] + '">' + c[1] + " " + c[2] + "</span>").join("") +
    '<span class="chip total">' + shown + " of " + D.behaviors.length + " behaviors</span></div>";
}

function chosenLabel() {
  const r = reference();
  return r ? r.label : "no reference";
}

function refCounts() {
  const r = reference();
  if (r) return r.counts;
  const pinned = D.behaviors.filter(b => b.pinned);
  const scored = pinned.filter(b => b.current != null).length;
  return {holding: 0, moved: 0, failing: 0, variance: 0, not_run: pinned.length - scored,
    no_score: 0, recorded: scored, unpinned: D.behaviors.length - pinned.length};
}

function refRefused() {
  const r = reference();
  return r ? r.refused : [];
}

function jumpTo(id) {
  const head = document.querySelector('[data-beh="' + id + '"]');
  if (!head) return;
  if (head.getAttribute("aria-expanded") !== "true") head.click();
  if (head.scrollIntoView) head.scrollIntoView({block: "center"});
}

const STATE = {pass: "passed", fail: "failed", partial: "partial credit",
  "not-applicable": "not scored", error: "errored"};

const RANK = {error: 0, fail: 1, partial: 2, pass: 3, "not-applicable": 4};

const SEVERITY = ["failing", "no-score", "regressed", "improved", "output-changed",
  "variance", "not-run", "new", "holding", "unpinned"];

function bySeverity(a, z) {
  return (SEVERITY.indexOf(a.verdict) - SEVERITY.indexOf(z.verdict)) ||
    ((a.current ?? 2) - (z.current ?? 2)) || a.id.localeCompare(z.id);
}

function failures() {
  const moved = new Set(reference() ? reference().moved : []);
  const rows = [];
  for (const b of D.behaviors.filter(x => x.pinned).map(withRef)) {
    for (const i of b.items) {
      if (RANK[i.state] <= 2) rows.push({b: b, i: i});
    }
  }
  rows.sort((x, z) => (RANK[x.i.state] - RANK[z.i.state]) || x.i.id.localeCompare(z.i.id));
  document.getElementById("failnote").textContent = rows.length
    ? rows.length + " individual case" + (rows.length === 1 ? "" : "s") +
      " scored below full marks, across " + new Set(rows.map(r => r.b.id)).size +
      " behaviors. Click a row to open it."
    : "Every case that was scored is at full marks.";
  const row = r =>
    '<button class="fx" data-go="' + esc(r.b.id) + '">' +
    '<span class="st ' + r.i.state + '">' + esc(STATE[r.i.state] || r.i.state) + "</span>" +
    '<code class="fxid">' + esc(r.i.id) + "</code>" +
    '<span class="fxsaid">' + esc(r.i.said || "") + "</span>" +
    '<span class="fxb">' + esc(r.b.text) + "</span></button>";
  const fresh = rows.filter(r => moved.has(r.b.id));
  const standing = rows.filter(r => !moved.has(r.b.id));
  const group = (heading, list) => list.length
    ? '<div class="fxgroup"><div class="fxhd">' + heading + "</div>" + list.map(row).join("") + "</div>"
    : "";
  document.getElementById("failures").innerHTML = rows.length
    ? (reference()
        ? group("Moved in this run, so these are findings about this change", fresh) +
          group("Already like this before this run, so not a finding about this change", standing)
        : group("Every case below full marks", rows))
    : '<div class="gap"><p>Nothing scored below full marks in this run.</p></div>';
}

const REF_KIND = {
  baseline: "the adopted baseline, the run this project agreed to measure against",
  previous: "the run recorded immediately before this one",
  other: "another run on record",
};

function refbar() {
  const el = document.getElementById("refbar");
  if (!D.references.length) {
    el.innerHTML = '<p class="refsent">This is the only run on record, so there is nothing ' +
      "to read it against. Every score below is absolute: what passed in this run, and " +
      "nothing about whether it changed.</p>";
    return;
  }
  const r = reference();
  const keys = Object.keys(D.runs.current.axes);
  const differ = r ? keys.filter(k => (r.axes[k] || "not recorded") !== D.runs.current.axes[k]) : [];
  const sentence = r
    ? "Every score below is read against <b>" + esc(r.label) + "</b>, " +
      esc(REF_KIND[r.kind] || r.kind) + ", recorded " +
      esc(r.recorded.slice(0, 16).replace("T", " ")) + ". " +
      (differ.length
        ? differ.length + " of the " + keys.length + " recorded settings" +
          (differ.length === 1 ? " differs" : " differ") +
          " between the two runs, listed at the foot of this page."
        : "The two runs were configured identically.")
    : "No run is selected to compare against, so every score below is absolute: what passed " +
      "in this run, and nothing about whether it changed.";
  const button = (name, label, kind, recorded) =>
    '<button class="refbtn" data-ref="' + esc(name || "") + '" aria-pressed="' +
    (refName === name ? "true" : "false") + '">' +
    "<em>" + esc(kind) + "</em><span>" + esc(label) + "</span>" +
    (recorded ? '<span class="rd">' + esc(recorded.slice(0, 16).replace("T", " ")) + "</span>" : "") +
    "</button>";
  el.innerHTML = '<p class="refsent">' + sentence + "</p>" +
    '<div class="refbtns"><span class="rl">read against</span>' +
    D.references.map(r => button(r.name, r.label, r.kind, r.recorded)).join("") +
    button(null, "nothing, show absolute scores", "no comparison", "") + "</div>";
  el.querySelectorAll(".refbtn").forEach(btn => btn.addEventListener("click", () => {
    refName = btn.dataset.ref || null;
    render();
  }));
}

function header() {
  const cur = D.runs.current, base = D.runs.baseline;
  const dirty = / dirty$/.test(cur.axes.code);
  document.getElementById("sources").innerHTML =
    "<span>agent code <b>" + esc(cur.axes.code.replace(/ dirty$/, "")) + "</b>" +
      (dirty ? ", plus changes that were never committed" : "") + "</span>" +
    "<span>ran on <b>" + esc(cur.axes.environment) + "</b></span>" +
    "<span>this run <b>" + esc(cur.label) + "</b> " + esc(cur.recorded) + "</span>" +
    (base ? "<span>adopted baseline <b>" + esc(base.label) + "</b></span>"
          : "<span><b>no baseline adopted yet</b></span>");
  const scored = D.behaviors.filter(b => b.pinned && b.current != null).length;
  const pinned = D.behaviors.filter(b => b.pinned).length;
  const items = D.scored_items;
  document.getElementById("cmd").innerHTML =
    "$ python -m benchmarks.runner report\n" +
    "<span>  run     " + esc(cur.name) +
    (D.duration ? "          [" + D.duration + "s]" : "") +
    "\n  scored  " + scored + " of " + pinned + " measured behaviors over " + items +
    " distinct dataset items" +
    "\n  wrote   benchmarks/runs/" + esc(cur.name) + ".json and this page</span>";
  document.getElementById("foot").textContent =
    "Generated " + D.generated_at + ". Noise floor " + D.noise_floor +
    ", the largest move seen between two runs of identical code and models. " +
    (D.unclaimed_evals.length
      ? "These evals score something no behavior in the manifest claims, so their results " +
        "appear nowhere on this page: " + D.unclaimed_evals.join(", ") + "."
      : "Every eval that runs is claimed by a behavior in the manifest, so nothing scored " +
        "is missing from this page.");
}

function verdict() {
  const el = document.getElementById("verdict");
  const shown = D.behaviors.map(withRef);
  const down = shown.filter(b => b.verdict === "regressed").length;
  const up = shown.filter(b => b.verdict === "improved").length;
  const silent = shown.filter(b => b.verdict === "output-changed").length;
  const failing = shown.filter(b => b.verdict === "failing").length;
  const counts = refCounts();
  const chosen = reference();
  const byId = Object.fromEntries(D.behaviors.map(b => [b.id, b]));
  const weak = (D.short_of_full_marks || []).map(id => byId[id]).filter(Boolean);

  const refused = refRefused();
  if (refused.length) {
    el.className = "verdict refused";
    el.innerHTML = '<div class="eyebrow">Comparison refused</div>' +
      "<h2>These two runs cannot be compared</h2>" +
      "<p>" + refused.length + " thing" + (refused.length > 1 ? "s" : "") +
      " differ that were not declared as the change under test, so any difference in the scores could " +
      "come from any of them. Line them up, or re-run the baseline against today's state, then compare again.</p>" +
      '<div class="tally">' + refused.map(k =>
        '<span class="chip broken">' + esc(AXIS_LABELS[k] || k) + "</span>").join("") + "</div>";
    return;
  }
  el.className = "verdict";
  if (!chosen) {
    el.innerHTML = '<div class="eyebrow">' + esc(D.runs.current.label) + "</div>" +
      "<h2>" + counts.recorded + " behavior" + (counts.recorded === 1 ? "" : "s") +
      " recorded, with nothing selected to compare against</h2>" +
      "<p>Nothing here is a regression or an improvement, because there is nothing to " +
      "compare to yet. What the page can show is the absolute state: which items pass, " +
      "which do not, and what the evaluator computed for each. Adopt this run as the " +
      "baseline once it is what main does today.</p>" +
      '<div class="tally">' +
      '<span class="chip hold">' + (counts.recorded - weak.length) +
        " with every item passing</span>" +
      '<span class="chip broken">' + weak.length + " below full marks</span>" +
      (counts.not_run
        ? '<span class="chip unknown">' + counts.not_run + " measured, but this run scored " +
          "nothing for them</span>"
        : "") +
      '<span class="chip unpinned">' + counts.unpinned + " nothing measures these</span></div>";
    return;
  }
  el.innerHTML = '<div class="eyebrow">' +
    esc(chosen.label) + " &rarr; " + esc(D.runs.current.label) +
    "</div><h2>" + down + " regressed, " + up + " improved, " + silent +
    " changed output without moving a score</h2><p>" +
    (D.under_test.length
      ? "Declared as under test: " + D.under_test.map(esc).join(", ") + ". "
      : "Nothing was declared as under test. ") +
    failing + " behavior" + (failing === 1 ? " is" : "s are") +
    " failing on both runs, which a comparison between two models alone would report as no change.</p>" +
    tally(counts);
}

function axes() {
  const cur = D.runs.current, base = reference();
  const axisKeys = Object.keys(cur.axes);
  const blank = axisKeys.filter(k => cur.axes[k] === "not recorded");
  document.getElementById("axisnote").textContent =
    axisKeys.length + " axes recorded per run" +
    (blank.length
      ? ". " + blank.length + " were not captured, so they cannot be compared: " +
        blank.map(k => AXIS_LABELS[k] || k).join(", ")
      : ". All captured.");
  if (!base) {
    document.getElementById("axes").innerHTML =
      '<div class="gap"><p>Nothing selected to compare against. Pick a run above, or ' +
      "mark one as the baseline with " +
      "<code>python -m benchmarks.runner baseline &lt;run name&gt;</code>.</p></div>";
    return;
  }
  document.getElementById("axes").innerHTML = Object.keys(cur.axes).map(k => {
    const a = base.axes[k] || "not recorded", z = cur.axes[k], differs = a !== z;
    // Neither side recorded it, so it was not verified identical.
    const blind = a === "not recorded" || z === "not recorded";
    const cls = ["axis-row", blind ? "unknown" : differs ? "differs" : "same"];
    let flag = blind ? "not compared" : differs ? "differs" : "same";
    if (differs && D.under_test.indexOf(k) >= 0) { cls.push("under-test"); flag = "under test"; }
    if (refRefused().indexOf(k) >= 0) { cls.push("blocking"); flag = "refuses the comparison"; }
    return '<div class="' + cls.join(" ") + '"><div class="name">' + esc(AXIS_LABELS[k] || k) + "</div>" +
      '<div class="val">' + esc(a) + '</div><div class="val a">' +
      (differs || blind ? esc(z) : '<span class="same-as">identical</span>') + "</div>" +
      '<div class="axis-flag">' + flag + "</div></div>";
  }).join("");
}

function worstOf(component) {
  const r = reference();
  if (r) return r.components[component] || "holding";
  return D.behaviors.some(b => b.component === component && b.pinned) ? "new" : "unpinned";
}

function coverage() {
  const byId = Object.fromEntries(D.behaviors.map(b => [b.id, withRef(b)]));
  const comparing = reference() != null;
  document.getElementById("coverage").innerHTML = D.components.map(c => {
    const mine = D.behaviors.filter(b => b.component === c.id).map(b => byId[b.id]);
    const state = b => comparing
      ? {cls: CLS[b.verdict] || "unpinned", word: WORD[b.verdict] || b.verdict}
      : absoluteState(b);
    const rank = ["broken", "moved", "unknown", "hold", "unpinned"];
    const worst = mine.map(state).sort((a, z) =>
      rank.indexOf(a.cls) - rank.indexOf(z.cls))[0] || {cls: "unpinned", word: "no behaviors"};
    return '<div class="covrow"><span class="cn">' + esc(c.name) + "</span>" +
      '<span class="bars">' + mine.map(b => {
        const st = state(b);
        return '<i class="bar ' + st.cls + '" title="' +
          esc(b.text + " \u2013 " + st.word) + '"></i>';
      }).join("") + "</span>" +
      '<span class="cp">' + c.pinned + " of " + c.total + " measured</span>" +
      '<span class="cw ' + worst.cls + '">' + esc(worst.word) + "</span></div>";
  }).join("");
  const pinned = D.behaviors.filter(b => b.pinned).length;
  document.getElementById("covnote").textContent =
    D.components.length + " components, " + D.behaviors.length + " behaviors, " +
    pinned + " of them measured by an eval. Each mark is one behavior.";
}

const showAll = new Set();
const open = new Set();
let apSeq = 0;
function promptBlock(b) {
  const id = "ap" + (++apSeq);
  return '<div class="ap"><div class="ap-bar">' +
    '<button class="ap-toggle" aria-expanded="false" aria-controls="' + id + '">' +
    '<span class="ap-kind ' + esc(b.fix.kind) + '">' + esc(b.fix.kind) + "</span>" +
    '<span class="ap-why">' + esc(KIND[b.fix.kind] || "") + "</span>" +
    '<span class="ap-title">Prompt for a coding agent &middot; ' + esc(b.fix.title) + "</span>" +
    '<span class="ap-chev">show</span></button>' +
    '<button class="ap-copy" data-for="' + id + '">Copy</button></div>' +
    '<pre id="' + id + '" hidden>' + esc(b.prompt) + "</pre></div>";
}

function behaviors() {
  const all = D.behaviors.map(withRef);
  const comparing = all.some(b => b.pinned && b.verdict !== "new");
  const changed = all.filter(b => b.pinned && b.verdict !== "holding" && b.verdict !== "new").length;
  document.getElementById("behnote").textContent = comparing
    ? changed + " of " + all.filter(b => b.pinned).length +
      " measured behaviors read as something other than holding. Worst first."
    : "No run selected to compare against, so these are absolute scores. Worst first.";
  apSeq = 0;
  document.getElementById("behaviors").innerHTML = all
    .slice()
    .sort(bySeverity)
    .map(b => {
      const where = manifestName(b.component);
      if (!b.pinned) {
        return '<div class="beh"><button class="beh-head" data-beh="' + esc(b.id) +
          '" aria-expanded="false">' +
          '<span class="beh-top' + (comparing ? "" : " solo") + '">' +
          '<span class="bscore na">\u2013</span>' +
          (comparing ? '<span class="bdelta flat"></span>' : "") +
          '<span class="beh-text">' + esc(b.text) + "</span>" +
          '<span class="pill unpinned">nothing measures this</span></span>' +
          '<span class="beh-checks"><span class="beh-where">' + esc(where) + "</span>" +
          esc(b.skipped || "No eval covers this behavior, so nothing here would notice if it broke.") +
          "</span></button>" +
          '<div class="beh-body" hidden><div class="gap">' +
          "<p>" + esc(b.blind) + "</p>" + promptBlock(b) + "</div></div></div>";
      }
      const d = b.delta;
      const flat = d == null || Math.abs(d) <= D.noise_floor;
      const dCls = flat ? "flat" : (d > 0 ? "up" : "down");
      const cell = v => v == null ? '<span class="num na">\u2013</span>'
        : (b.metric === "rate"
            ? (v >= 1 ? '<span class="pass">pass</span>' : '<span class="fail">fail</span>')
            : '<span class="num">' + fmt(v) + "</span>");
      const ordered = b.items.slice().sort((x, y) =>
        (RANK[x.state] - RANK[y.state]) || x.id.localeCompare(y.id));
      const openByDefault = new Set(
        ordered.filter(i => i.state === "fail" || i.state === "partial" || i.state === "error")
               .map(i => i.id));

      const field = (name, value, cls) => value
        ? '<div class="fld ' + (cls || "") + '"><span class="fname">' + esc(name) + "</span>" +
          '<div class="fval">' + esc(value) + "</div></div>"
        : "";
      // Silence would read as "there was none" rather than "this run did not keep it".
      const required = (name, value, cls) => value
        ? field(name, value, cls)
        : '<div class="fld"><span class="fname">' + esc(name) + "</span>" +
          '<div class="fval na">not captured by the run that produced this page</div></div>';

      const quiet = ordered.filter(i => i.state === "pass" || i.state === "not-applicable");
      const loud = ordered.filter(i => i.state !== "pass" && i.state !== "not-applicable");
      const items = loud.concat(showAll.has(b.id) ? quiet : []).map(i => {
        const open = openByDefault.has(i.id);
        const sibs = (i.siblings || []).map(s =>
          '<div class="sib"><code>' + esc(s.name) + "</code>" +
          "<b>" + fmt(s.value) + "</b>" +
          (s.said ? "<span>" + esc(s.said) + "</span>" : "") + "</div>").join("");
        const moved = i.before != null && i.after != null && i.before !== i.after;
        const record =
          field("what kind of case this is, per the dataset", i.label) +
          required("the request, as the dataset wrote it", i.input) +
          required("what the model answered", i.output, "wide") +
          required("what the item declares", i.expected) +
          field(i.state === "not-applicable"
            ? "why nothing was scored"
            : "how " + b.recorded_evaluator + " read that",
            i.state === "not-applicable"
              ? b.recorded_evaluator + " reads a key this item does not declare, so it had "
                + "nothing to check. The item stays in the set for the other behaviors "
                + "scored from " + b.eval + "."
              : i.said) +
          (i.error ? field("the run errored", i.error, "bad") : "") +
          (sibs ? '<div class="fld"><span class="fname">other scores on this item</span>' +
            '<div class="fval">' + sibs + "</div></div>" : "") +
          (i.trace ? '<div class="fld"><span class="fname">where this item ran</span>' +
            '<div class="fval">' +
            '<a href="' + esc(i.trace) + '" target="_blank" rel="noreferrer">' +
            esc(i.id) + " in Langfuse</a>" +
            (i.seconds != null ? " &middot; " + i.seconds + "s" : "") + "</div></div>" : "");

        return '<div class="item ' + i.state + '">' +
          '<button class="ihead" aria-expanded="' + (open ? "true" : "false") + '">' +
          '<span class="st ' + i.state + '">' + STATE[i.state] + "</span>" +
          '<code class="iid">' + esc(i.id) + "</code>" +
          '<span class="isum">' + esc(i.label || i.said || "") + "</span>" +
          '<span class="ival">' + (moved ? cell(i.before) + '<span class="arrow">\u2192</span>' : "") +
          cell(i.after) + "</span>" +
          '<span class="ichev" aria-hidden="true"></span></button>' +
          '<div class="irec"' + (open ? "" : " hidden") + ">" + record + "</div></div>";
      }).join("");
      const cnt = b.counts || {};
      const stats = '<div class="stats">' +
        '<span><b>' + cnt.scored + "</b> of " + cnt.items + " items scored</span>" +
        '<span class="ok"><b>' + cnt.passed + "</b> pass</span>" +
        '<span class="bad"><b>' + cnt.failing + "</b> below full marks</span>" +
        (cnt.items > cnt.scored
          ? '<span class="na"><b>' + (cnt.items - cnt.scored) +
            "</b> not applicable</span>" : "") +
        "</div>";
      // A mean over a balanced set can hide a class that always fails.
      const splits = (b.breakdowns || []).map(bd => {
        const worst = bd.splits.reduce((a, c) => (c.mean < a.mean ? c : a));
        const notable = bd.spread > D.noise_floor;
        return '<div class="split' + (notable ? " notable" : "") + '">' +
          '<span class="sname">by ' + esc(bd.dimension) + "</span>" +
          '<span class="srow">' + bd.splits.map(sp =>
            '<span class="sp' + (notable && sp === worst ? " weakest" : "") + '">' +
            esc(sp.value) + " <b>" + sp.reading + "</b>" +
            '<em>' + fmt(sp.mean) + "</em></span>").join("") + "</span>" +
          (notable
            ? '<span class="snote">' + esc(worst.value) + " is the weak half, " +
              fmt(bd.spread) + " below the best. The overall number is the average of " +
              "the two and describes neither.</span>"
            : "") + "</div>";
      }).join("");
      const splitBlock = splits
        ? '<div class="splits"><div class="splits-hd">The same score, split by what the ' +
          "items declare</div>" + splits + "</div>"
        : "";
      const sens = b.sensitivity
        ? '<div class="sens' + (b.coarse ? " warn" : "") + '">' +
          esc(b.sensitivity) + "</div>"
        : "";
      const shaped = b.items.filter(i => i.shape && i.shape.rows.length)[0];
      const unstructured = b.items.filter(i => i.shape && !i.shape.comparable).length;
      let diffHtml = "";
      if (shaped) {
        const s = shaped.shape;
        const gone = s.rows.filter(r => r.kind === "removed");
        const added = s.rows.filter(r => r.kind === "added");
        const col = (cls, label, rows) =>
          '<div class="shape-col ' + cls + '"><span class="lbl">' + label + "</span>" +
          (rows.length
            ? "<ul>" + rows.map(r => "<li>" + esc(r.entry) + "</li>").join("") + "</ul>"
            : '<span class="none">nothing</span>') + "</div>";
        diffHtml = '<div class="shape"><div class="shape-head">' +
          "<strong>What changed in the output</strong><span>" + esc(shaped.id) + "</span>" +
          '<span class="more">' + esc(s.summary) + "</span></div>" +
          '<div class="shape-cols">' +
          col("gone", "only in " + chosenLabel(), gone) +
          col("new", "only in current", added) + "</div>" +
          '<div class="shape-note">Compared: every key path, and any text value with no ' +
          "spaces in it of " + D.identifier_max_chars + " characters or fewer, so field " +
          "types, labels and option labels all count. Not compared: text with a space in " +
          "it, treated as prose a model may reword freely; the value of any number, " +
          "compared by type alone; and the ids, data model bindings and option slugs the " +
          "model invents for itself, where only whether the field carries one is compared. " +
          "Two models never spell those the same way, and comparing them buried real " +
          "findings under hundreds of rows." +
          (s.reordered ? " The same fields also appear in a different order." : "") +
          (s.total > s.rows.length ? " Showing " + s.rows.length + " of " + s.total + "." : "") +
          "</div></div>";
      } else if (unstructured) {
        diffHtml = '<div class="shape"><div class="shape-note">' + unstructured +
          " item(s) produce unstructured output, so a rewording cannot be told from a real " +
          "change. Only the score covers those.</div></div>";
      }
      const cntFor = b.counts || {};
      const means = esc(b.readings.current) +
        (!flat ? ", a change of " + (d > 0 ? "+" : "") + fmt(d) + " against " +
                 esc(chosenLabel()) + " which read " + fmt(b.baseline) + "."
               : d == null
                 ? ". Nothing is selected to compare against, so the only thing this number " +
                   "can say is the absolute state: " + cntFor.passed + " of " + cntFor.scored +
                   " scored items at full marks."
                 : ", unchanged against " + esc(chosenLabel()) + " past the noise floor.") +
        (b.previous != null && b.previous !== b.baseline
          ? " The run before this one read " + fmt(b.previous) + "."
          : "");
      const pill = comparing
        ? {cls: b.verdict_class, word: b.verdict_word}
        : absoluteState(b);
      const worthOpening = open.has(b.id) ||
        (!open.size && (b.current == null || b.current < 1 ||
          (b.verdict !== "holding" && b.verdict !== "new")));
      return '<div class="beh"><button class="beh-head" data-beh="' + esc(b.id) +
        '" aria-expanded="' + (worthOpening ? "true" : "false") + '">' +
        '<span class="beh-top' + (comparing ? "" : " solo") + '">' +
        '<span class="bscore">' + fmt(b.current) + "</span>" +
        (comparing
          ? '<span class="bdelta ' + dCls + '">' +
            (d == null ? "" : (d > 0 ? "+" : "") + fmt(d)) + "</span>"
          : "") +
        '<span class="beh-text">' + esc(b.text) + "</span>" +
        '<span class="pill ' + pill.cls + '">' + esc(pill.word) + "</span></span>" +
        '<span class="beh-checks"><span class="beh-where">' + esc(where) + "</span>" +
        esc(b.checks) + "</span>" +
        "</button>" +
        '<div class="beh-body"' + (worthOpening ? "" : " hidden") + '>' +
        '<p class="lede">' + means + "</p>" +
        '<dl class="meta">' +
        "<div><dt>Measured by</dt><dd>" + esc(b.measured_by) + "</dd></div>" +
        "<div><dt>Scored as</dt><dd>" + (b.metric === "rate"
          ? "The mean of a per-item pass or fail, so it is the share of items that pass."
          : "The mean of a per-item ratio, so an item can take partial credit.") +
          (b.misdeclared
            ? ' <span class="warnpill">declared &ldquo;' + esc(b.declared_metric) +
              '&rdquo; in the manifest, but items took partial credit</span>'
            : "") + "</dd></div>" +
        "<div><dt>Dataset</dt><dd>" + esc(b.eval) + "</dd></div></dl>" +
        stats + sens + splitBlock +
        '<div class="itemhead"><h4>Items</h4>' +
        '<span>scored by ' + esc(b.recorded_evaluator) + "</span></div>" +
        '<div class="items">' + items +
        (quiet.length && !showAll.has(b.id)
          ? '<button class="more" data-more="' + esc(b.id) + '">' + quiet.length +
            " further item" + (quiet.length === 1 ? "" : "s") + ": " +
            quiet.filter(i => i.state === "pass").length + " at full marks, " +
            quiet.filter(i => i.state === "not-applicable").length +
            " not scored. Show them.</button>"
          : "") + "</div>" +
        diffHtml +
        '<div class="reading">' +
        '<div class="lim"><dt>What this eval cannot see</dt><dd>' + esc(b.blind) + "</dd></div></div>" +
        (b.issue
          ? '<div class="note">Known and filed as <a href="https://github.com/' +
            esc(b.issue.split("#")[0]) + "/issues/" + esc(b.issue.split("#")[1]) +
            '" target="_blank" rel="noreferrer">' + esc(b.issue) +
            "</a>. A number here that looks wrong may be that issue and not a new one.</div>"
          : "") +
        promptBlock(b) + "</div></div>";
    }).join("");

  document.querySelectorAll(".fx").forEach(row =>
    row.addEventListener("click", () => jumpTo(row.dataset.go)));
  document.querySelectorAll(".beh-head, .ihead").forEach(h => h.addEventListener("click", () => {
    const was = h.getAttribute("aria-expanded") === "true";
    const body = h.parentElement.querySelector(".beh-body") || h.nextElementSibling;
    h.setAttribute("aria-expanded", String(!was));
    body.hidden = was;
    const id = h.dataset.beh;
    if (id) { was ? open.delete(id) : open.add(id); }
  }));
  document.querySelectorAll(".more").forEach(btn => btn.addEventListener("click", () => {
    showAll.add(btn.dataset.more);
    open.add(btn.dataset.more);
    render();
  }));
  document.querySelectorAll(".ap-toggle").forEach(t => t.addEventListener("click", () => {
    const pre = document.getElementById(t.getAttribute("aria-controls"));
    const open = t.getAttribute("aria-expanded") === "true";
    t.setAttribute("aria-expanded", String(!open));
    pre.hidden = open;
    t.querySelector(".ap-chev").textContent = open ? "show" : "hide";
  }));
  document.querySelectorAll(".ap-copy").forEach(btn => btn.addEventListener("click", () => {
    const pre = document.getElementById(btn.dataset.for);
    const done = () => {
      btn.classList.add("done");
      setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pre.textContent).then(() => {
        btn.textContent = "Copied"; done();
      }).catch(() => {
        pre.hidden = false;
        const r = document.createRange(); r.selectNodeContents(pre);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        btn.textContent = "Selected"; done();
      });
    } else {
      pre.hidden = false;
      btn.textContent = "Select and copy"; done();
    }
  }));
}

function render() { refbar(); header(); verdict(); coverage(); failures(); axes(); behaviors(); }
render();
</script></body></html>
"""
