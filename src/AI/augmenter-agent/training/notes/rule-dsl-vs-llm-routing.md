# Idea note: config-driven rules via DSL (vs LLM-driven tool routing)

**Status:** parked — revisit when productizing Spor C
**Origin:** discussion 2026-05-19 after Spor C round-1 win
**Why parked:** more pressing question is whether better models change the picture

## The problem

Spor C achieved 100%/100%/10s by encoding 27 deterministic rules in `orchestrate_points.py`.
That works, but adding a new sjekkliste-punkt requires a Python edit. We want
**config-only rule authoring** — domain experts add rules without touching code.

## Two designs

### Design A — structured DSL (deterministic interpreter)

```yaml
- id: styrer_alder
  type: rule
  evaluation:
    compute: age_at
    args:
      fnr: $.Bevillingsansvarlig.Styrer.Foedselsnummer
      reference: $.Arrangement.ArrangementPeriode[0].StartDato
    bind: alder
  decide:
    - when: "alder >= 20"
      status: vurdert_ok
      merknad: "Styrer er {alder} år ved arrangementsdato (kravet er 20)"
    - when: "alder < 20"
      status: vurdert_avslag
      merknad: "Styrer er {alder} år — under aldersgrensen"
    - default:
        status: maa_undersokes
        merknad: "Kunne ikke beregne alder fra fødselsnummer"
```

A ~200 LOC interpreter + ~150 LOC tool-registry (`age_at`, `date_diff_days`,
`time_within`, `field_present`, `lookup`, `matches_regex`, ~15-20 primitives) covers
the full current rule set.

### Design B — natural-language + LLM-driven routing

```
"sjekk at søker med {soker.fnr} er over 18 år på {arrangement.dato}"
```

LLM gets the prose + tool inventory, picks the tool, picks the args, formats the
merknad. Closer to Claude's native function-calling style.

## Honest tradeoff

| | Design A | Design B |
|---|---|---|
| Config-only new rules | ✓ structured | ✓✓ pure prose |
| Reliable with Gemma 4 | ✓ byte-stable | ✗ Gemma weak at function-calling |
| Latency per rule | <50ms | 3-5s LLM call |
| Determinism | byte-stable | ±X% variance |
| LLM cost for mechanical rules | 0 | 1 call per rule |
| Scaling to 60 punkter | ~10ms total | 60 × 5s = 300s |

**Design B re-introduces the failure mode Spor C eliminated.** With Gemma 4 it's also
unreliable. With a better model (Claude, GPT-4), B becomes viable — but A still
dominates on latency and cost for the mechanical checks. Better models help LLM-judgment
rules, not mechanical ones.

## Recommended hybrid (the design to actually build)

Build Design A as the primary path, but use the same rule-template format for the few
punkter that need LLM judgment — distinguished by `type: llm`:

```yaml
# Mechanical
- id: styrer_alder
  type: rule
  evaluation: { compute: age_at, ... }
  decide: [...]

# LLM judgment — jq-paths expanded BEFORE the model sees the prompt
- id: lokalitet_egnethet
  type: llm
  prompt: |
    Vurder om {sted.navn} ({sted.adresse}) er egnet for {alkoholgruppe}.
  context:
    sted.navn: $.Arrangement.Arrangementssted.StedsNavn
    sted.adresse: $.Arrangement.Arrangementssted.StedsAdresse.Gateadresse
    alkoholgruppe: $.Arrangement.VaregruppeAlkohol
  status_enum: [vurdert_ok, maa_undersokes, ikke_relevant]
```

The LLM never picks a tool. It only decides status + writes merknad for the genuinely
judgmental cases. The tool registry is the only Python/C# surface and grows broadly-reusable.

## When/how to pick this up

Spawn it as `exp-rule-dsl` (Spor D) in a future experiment round:

1. Port Spor C's 27 Python rules to YAML using Design A's schema.
2. Build the interpreter + tool-registry.
3. Run against julebord-kristiansand + minimal-arrangement + 1-2 hand-crafted variants.
4. Compare to Spor C on: score, wall-time, lines-of-config-per-rule, time-to-add-new-rule.
5. If score holds at 100% and config-per-rule ≤ 15 lines, it's the productization target.

## Risks to validate before committing

- **Expressiveness ceiling**: do all 27 Spor C rules fit cleanly in the DSL? A few might
  not (e.g. multi-step decisions with intermediate computations). Prototype 5-10 first
  to find the bend points.
- **jq vs JSONPath vs Jsonpath-plus**: pick one and stick with it. .NET ecosystem has
  good JSONPath libs; Python has `jsonpath-ng`.
- **Tool versioning**: if a tool's behavior changes, all rules using it shift. Need a
  way to pin tool versions OR commit to backwards-compatible tool semantics.

## Connection to "agent finds tool itself"

That part of the original idea — letting the LLM discover the tool from a registry —
is technically Anthropic's tool-use / OpenAI function-calling. Worth revisiting **if**
we move to a model that's actually good at it (Claude, GPT-4, or Gemma's bigger sibling
Gemini). For the v0.3 production target on small models, Design A's explicit `tool:` and
`args:` fields are more reliable.
