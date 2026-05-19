# Synthesis: exp-{{NAME}}

Update this throughout the experiment. The cross-experiment synthesis agent
reads ONLY this file and the run scores — make it self-contained.

## TL;DR

(One sentence answering: what is the single most important lesson from this experiment?)

## Hypothesis we tested

(Copy the "What we believe" statement from HYPOTHESIS.md.)

## What worked

- (Concrete observation → concrete prompt/code tweak. Link to the run-NNN.json that first showed it.)

## What did NOT work

- (Observation + best guess at *why*: context-overflow? format confusion? model bias toward Norwegian? token limit?)

## Generalizable lessons (other experiments should read these)

- (Things that aren't specific to this experiment's hypothesis — patterns about Pi+Gemma, prompt structure, evaluation methodology.)

## Concrete artifacts to consider productizing

- File: `path/to/winning-prompt.md` — produces valid JSON 9/10 runs, status-agreement 73%
- File: `path/to/eval-tweak.py` — caught failures evaluate.py missed

## What we would try with more time

- (Specific next experiments suggested by what we learned.)

## Methodology notes for future sub-agents

- (Process improvements: "always capture raw stderr too, the 400 errors are informative", "vary one thing at a time", etc.)

---

## Iteration log summary

| Run | Variant | Verdict | Point coverage | Status agreement | Notes |
|---:|---|---|---:|---:|---|
| 001 | baseline | | | | |
