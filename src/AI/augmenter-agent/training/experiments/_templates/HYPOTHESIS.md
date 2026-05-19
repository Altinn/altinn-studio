# Hypothesis: exp-{{NAME}}

- **Created**: {{DATE}}
- **Branch**: `{{BRANCH}}`
- **Port**: {{PORT}}
- **Base prompt source**: `/experiment/dump-prompt?step=checklist-agent` (the same prompt the v0.3 pipeline would emit)

## What we believe

{{HYPOTHESIS}}

## Why we believe it

(What evidence from earlier runs, baseline characterization, or model behavior led us here?)

## What we will vary

(List the dimensions this experiment will explore. Hold others constant.)

## What we will hold constant

- Input file: `examples/applications/julebord-kristiansand.json`
- Model: (whatever `Agent__Model` resolves to in this worktree's `.env`)
- Gold standard: `training/gold-standard/`

## Success criterion for this experiment

(Concrete and measurable. E.g. "≥80% of runs produce valid JSON" or "status-agreement ≥70%".)

## Stopping condition

(When do we declare this hypothesis answered, even if not "successful"? E.g. "After 10 runs of the best variant, OR when we've shown the approach fundamentally cannot work.")
