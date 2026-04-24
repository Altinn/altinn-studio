---
name: rebase-stacked-pr
description: Rebase a stacked PR onto main after its parent was squash-merged, using `git rebase --onto` to skip already-merged commits. Use when rebasing a stacked or dependent PR, handling a squash-merged parent PR, or recovering from empty commits or spurious conflicts after `git rebase main`.
---

# Rebase a stacked PR after squash-merge

This skill handles the mechanical rebase when a child PR's parent PR has been squash-merged to `main`. A naive `git rebase main` fails or produces conflicts because the child branch still contains the parent's pre-squash commits, which are logically identical to — but SHA-different from — the new squashed commit on `main`.

The fix is `git rebase --onto main <pre-squash-parent-tip> <child-branch>`, which replays only the child's own commits and skips the already-merged ones.

## Do not use this skill if

- The parent PR has not yet been merged — just rebase onto the parent branch normally (`git rebase origin/parent-branch`).
- The parent PR was merge-committed (not squash-merged) — a plain `git rebase main` works fine in that case.

## Inputs required

Before running commands, confirm:

1. **Parent PR number** — see [Finding the parent PR number](#finding-the-parent-pr-number).
2. **Child branch name** — usually the current branch; verify with `git branch --show-current`.
3. **Parent is actually merged** — check with `gh pr view <PARENT_PR> --json state,mergedAt`. Abort if state is not `MERGED`.

If the child PR description contains a "Rebase instructions" block with explicit variables, prefer those values.

## Finding the parent PR number

Check the child PR description for explicit declarations first:

- `Depends on #`, `Stacked on #`, `Parent: #`
- A `Related` or `Related issues` section — common in this codebase. **Filter to PRs only**; issue numbers referenced there are not valid parents.

Any `#NNNN` reference may be either a PR or an issue. Confirm it is a PR:

```bash
gh pr view <N> --json headRefName,state   # errors if N is an issue, not a PR
```

**Strongest signal — matching branch names.** The parent PR's head branch should equal the child PR's base branch. Cross-check every candidate:

```bash
CHILD_BASE=$(gh pr view --json baseRefName -q .baseRefName)   # child PR on current branch
gh pr view <CANDIDATE> --json headRefName -q .headRefName
```

If those match, the candidate is almost certainly the parent.

Alternatively, search for PRs whose head branch matches the child's base:

```bash
gh pr list --state merged --head "$CHILD_BASE" --json number,title,url
```

**Ask the user** if any of the following hold — do not guess:

- No explicit marker is present and no candidate branch matches.
- Multiple PRs plausibly match.
- You are not completely certain the candidate is the intended parent.

## Procedure

```bash
# 1. Resolve the pre-squash tip of the parent PR.
# This is the last commit on the parent branch before it was squashed and merged.
OLD_PARENT_TIP=$(gh pr view "$PARENT_PR" --json commits -q '.commits[-1].oid')

# 2. Make sure local main is up to date.
git fetch origin main

# 3. Make sure the child branch is checked out and clean.
git status --porcelain    # must be empty
git checkout "$CHILD_BRANCH"

# 4. Replay only the child's commits onto main.
git rebase --onto origin/main "$OLD_PARENT_TIP"
```

## Verification

After the rebase, the log should show **only** the child PR's commits between main and HEAD:

```bash
git log --oneline origin/main..HEAD
```

If that list contains commits that belong to the parent PR (check their messages against `gh pr view $PARENT_PR --json commits`), the rebase replayed already-merged work — undo it and investigate.

The rebase has already completed at this point, so `git rebase --abort` is a no-op. Reset back to the pre-rebase tip, which Git records in `ORIG_HEAD`:

```bash
git reset --hard ORIG_HEAD
```

If `ORIG_HEAD` has been overwritten by a later operation, recover the pre-rebase commit from the reflog:

```bash
git reflog              # find the entry just before "rebase (start)"
git reset --hard <sha>  # or: git reset --hard HEAD@{N}
```

Note: `git rebase --abort` is only valid **during** an in-progress rebase (mid-conflict). For that case, see [Handling conflicts](#handling-conflicts) below.

## Pushing

Once verification passes:

```bash
git push --force-with-lease
```

Always `--force-with-lease`, never plain `--force` — lease protects against overwriting a teammate's push to the same branch.

## Handling conflicts

`--onto` skips already-merged commits but does **not** prevent real conflicts when `main` has moved and touched the same lines as the child branch.

- If `git rebase --onto` stops with a conflict, do **not** resolve blindly.
- Surface the conflicting files to the user and ask for guidance before editing.
- The user may prefer `git rebase --abort` and a different strategy (e.g., merge rather than rebase, or resolving on a throwaway branch first).

## Edge cases

- **Parent branch was force-pushed during review**: `gh pr view --json commits` returns the *final* commit list of the PR at merge time, which is what you want. Don't use the local `origin/parent-branch` ref — it may point at an obsolete tip.
- **Deep stack (3+ levels)**: rebase bottom-up, one level at a time. After the bottom child is rebased and pushed, treat the next level up as a new child whose parent is now the rebased branch.
- **`gh` not authenticated**: fall back to asking the user for the pre-squash tip SHA, which is visible on the closed PR page as the last commit before the merge event.

## PR description template (for authors)

Authors of stacked PRs should include this block in the PR description so future agents (and humans) can run the rebase without context:

```markdown
## Stack

- Depends on: #<PARENT_PR> (must merge first)
- Parent branch: `<parent-branch-name>`

## Rebase instructions (for agents)

When #<PARENT_PR> is squash-merged to main, rebase this branch with:

    PARENT_PR=<PARENT_PR>
    CHILD_BRANCH=<this-branch-name>
    OLD_PARENT_TIP=$(gh pr view $PARENT_PR --json commits -q '.commits[-1].oid')
    git fetch origin main
    git checkout $CHILD_BRANCH
    git rebase --onto origin/main $OLD_PARENT_TIP

Verify: `git log --oneline origin/main..HEAD` should show only this PR's commits.
Then: `git push --force-with-lease`.
```
