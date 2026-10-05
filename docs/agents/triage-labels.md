# Triage labels

The skills speak in terms of canonical triage roles. This file maps those roles to the label strings used in this repo's issue tracker. Labels marked _(new)_ don't exist in the repo yet. If one is missing, ask the user before creating it with `gh label create`.

## Category roles

| Role          | Label in our tracker   | Meaning                    |
| ------------- | ---------------------- | -------------------------- |
| `bug`         | `kind/bug`             | Something is broken        |
| `enhancement` | `kind/feature-request` | New feature or improvement |

## State roles

| Role              | Label in our tracker             | Meaning                                  |
| ----------------- | -------------------------------- | ---------------------------------------- |
| `needs-triage`    | `status/triage`                  | Maintainer needs to evaluate this issue  |
| `needs-info`      | `status/needs-info` _(new)_      | Waiting on reporter for more information |
| `ready-for-agent` | `status/ready-for-agent` _(new)_ | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `status/ready-for-human` _(new)_ | Fully specified, ready for a human       |
| `wontfix`         | _no label_, see below            | Will not be acted on                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from these tables.

**`wontfix`**: this repo doesn't use a label for it. Close the issue as not planned instead: `gh issue close <number> --reason "not planned" --comment "..."`. Find past rejections with `gh issue list --state closed --search 'reason:"not planned"'`.

**`status/for-consideration`** is not a triage role. The team uses it for issues to discuss that may need more specification, so don't treat it as `ready-for-human`.
