# Upstream sync

Fixes for v8 apps land first in [app-lib-dotnet](https://github.com/Altinn/app-lib-dotnet), which releases the v8
libraries. We merge them into [src/App/backend](../backend/README.md) so v9 gets them too. Changes go only in that
direction: v9 work is not merged back.

## Merge

Merge an upstream commit from a branch of `main`:

```sh
git fetch https://github.com/Altinn/app-lib-dotnet main
git merge -X subtree=src/App/backend <upstream-sha>
```

- Resolve conflicts inside the merge commit.
- Put the work to port a fix to v9 in a separate commit after the merge, so a reviewer can tell it from the upstream
  change.
- Keep test names the same as upstream, so the Verify snapshot files line up.

`git log --merges --oneline -- src/App/backend` lists the earlier syncs.

## Pull request

The sync must reach `main` as a merge commit. Git finds the next merge base from that commit. A squashed sync has no
link to upstream, so the next sync conflicts with every change it already brought in. The repository otherwise
squash-merges pull requests, so the sync pull request is merged with merge commits enabled for that merge only. Do
not rebase the branch either, since a rebase flattens the merge.

If a sync was squashed by mistake, merge the head of its branch into a new branch of `main` with `git merge -s ours`.
That records the upstream commits as merged without changing any files. Merge that pull request with a merge commit
too.
