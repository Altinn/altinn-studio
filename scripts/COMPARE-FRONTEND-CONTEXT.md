# Frontend Repo Comparison: Context and Findings

## Background / Original Request

The app-frontend has been copied from the legacy repo (`../app-frontend-react`) into this monorepo at `src/App/frontend`. Development continues in the legacy repo to some extent, with periodic syncs into the monorepo. Now we want to start making broader changes in the monorepo, and need to prevent developers working in the legacy repo from touching files that have diverged significantly. The goal is to:

1. Create a script that compares `src/App/frontend` (monorepo) with `../app-frontend-react` (legacy), ensuring both are on `main`.
2. List files that have changed significantly in the monorepo (>=50% of lines modified).
3. Include files that exist in the legacy repo but were **deleted** in the monorepo.
4. Ignore new files only present in the monorepo (not relevant to legacy devs).
5. Collapse directories where >=60% of files are significantly changed, showing just the folder.
6. Ignore minor changes (import rearrangements, small tweaks below the threshold).
7. Ultimately, publish this list and create a **commit-hook in the legacy repo** that warns developers when they touch these paths.

## What Was Built

### `scripts/compare-frontend-repos.ts`

A TypeScript script (run via `npx tsx`) that:

- Uses `git ls-files` to enumerate tracked files in the legacy repo (respects `.gitignore`).
- Skips binary files (images, fonts, archives).
- For each legacy file, checks if it exists in the monorepo:
  - If missing: marks it as **deleted**.
  - If present: runs `diff --unified=0` and counts removed lines (`^-[^-]`) as a percentage of the legacy file's total lines. This gives "what % of the original was modified" and naturally caps at 100%.
- Directories where >=60% of files are significant (changed or deleted) get collapsed into a single folder entry, with child directories absorbed by parents.
- Outputs both a human-readable summary and a machine-readable `scripts/changed-paths.txt`.

**Usage:**
```bash
npx tsx scripts/compare-frontend-repos.ts
npx tsx scripts/compare-frontend-repos.ts --threshold 50 --folder-collapse 60
```

### Key Design Decisions

- **Only count removed lines** from the legacy file in the diff (lines starting with `-`), not additions. This gives a meaningful "percentage of original modified" that caps at 100%.
- **`git ls-files`** instead of filesystem walk, so `.gitignore` is respected and build artifacts/caches are excluded automatically.
- **Deleted files are always significant** — if the monorepo removed a file, working on it in the legacy repo is wasted effort.
- **Folder collapsing** requires at least 2 significant files and >=60% of the directory's files to be affected. Parent directories absorb children to avoid redundancy.

## Current Results (2026-02-04)

Compared 1999 tracked files, 8 significantly changed, 46 deleted in monorepo. After collapsing: **22 entries**.

```
.gitattributes                                          (deleted in monorepo)
.github/                                                (3/3 files significantly changed)
.husky/                                                 (3/3 files significantly changed)
adr/001-component-library.md                            (deleted in monorepo)
renovate.json                                           (deleted in monorepo)
snapshots.js                                            (79% changed)
src/core/contexts/processingContext.tsx                  (deleted in monorepo)
src/core/errorHandling/DisplayErrorProvider.tsx          (deleted in monorepo)
src/features/applicationMetadata/                       (5/6 files significantly changed)
src/features/applicationSettings/ApplicationSettingsProvider.tsx  (78% changed)
src/features/form/dynamics/                             (3/3 files significantly changed)
src/features/form/layoutSets/LayoutSetsProvider.tsx     (deleted in monorepo)
src/features/form/rules/RulesContext.tsx                (deleted in monorepo)
src/features/formData/LegacyRules.ts                    (deleted in monorepo)
src/features/language/textResources/useGetAppLanguagesQuery.ts  (deleted in monorepo)
src/features/profile/ProfileProvider.tsx                (82% changed)
src/hooks/useWaitForState.ts                            (65% changed)
src/index.tsx                                           (50% changed)
src/utils/versioning/versions.ts                        (81% changed)
test/e2e/integration/frontend-test/language.ts          (53% changed)
test/e2e/integration/frontend-test/process-next.ts      (50% changed)
test/e2e/integration/multiple-datamodels-test/fetching.ts  (deleted in monorepo)
```

### Machine-readable output

Written to `scripts/changed-paths.txt` — one path per line, directories end with `/`.

## Next Steps (Not Yet Implemented)

1. **Commit hook for the legacy repo** (`app-frontend-react`): A pre-commit or commit-msg hook that reads the `changed-paths.txt` list and warns developers if any staged files match. This could be:
   - A `.husky/pre-commit` script in the legacy repo.
   - Reads the path list (either checked into the legacy repo or fetched from the monorepo).
   - Compares `git diff --cached --name-only` against the list.
   - Prints a warning but does not block the commit (or optionally blocks with a `--force` bypass).

2. **Periodic re-generation**: Run the comparison script as part of CI or before syncs to keep the list up to date.

3. **Consider filtering repo-level config**: Items like `.github/`, `.husky/`, `renovate.json`, `.gitattributes` are repo-level config that naturally differs between a standalone repo and a monorepo. These may not need warnings in the commit hook since they're never synced anyway. The `src/` entries are the ones that matter most.
