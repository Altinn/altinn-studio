# Microsandbox downstream maintenance

This runbook describes how to maintain the Microsandbox and libkrunfw forks used by
`sandbox-microsandbox`. It covers upstream synchronization, the Digdir patch queues, downstream
runtime publication and the exact source and artifact pins in this repository.

The repositories have different release units. A Microsandbox source update is not complete until
the matching host runtime and guest agent have been published and Altinn Studio pins both the source
commit and the published artifact digests.

## Repository and branch roles

| Repository                                                            | Upstream mirror | Downstream integration         | Consumer pin                                            |
| --------------------------------------------------------------------- | --------------- | ------------------------------ | ------------------------------------------------------- |
| `superradcompany/microsandbox` forked as `martinothamar/microsandbox` | `main`          | `main-digdir`                  | Root `Cargo.toml` and `Cargo.lock`                      |
| `superradcompany/libkrunfw` forked as `martinothamar/libkrunfw`       | `krunfw`        | `main-digdir`                  | Microsandbox `vendor/libkrunfw` submodule               |
| `Altinn/altinn-studio`                                                | Not applicable  | The current development branch | Microsandbox source revision and runtime SHA-256 values |

The mirror branches contain no Digdir changes. Update them with fast-forward-only pushes from their
corresponding upstream branches. Synchronizing a mirror branch does not select the next downstream
base: `main-digdir` is based on a stable Microsandbox release tag, not an arbitrary upstream `main`
commit. The `0.6.9-digdir.*` line predates this rule and sits two upstream commits past `v0.6.9`; the
first synchronization that follows this runbook moves the base onto the exact tag.

The `main-digdir` branches are downstream patch queues. Rebuild them on temporary synchronization
branches and review each patch when moving to a new upstream base. Do not merge an upstream release
into a patch queue: the resulting conflict-resolution merge hides which downstream patches remain
necessary and makes later synchronization harder.

## Required invariants

- Before rewriting a published downstream branch, create an immutable tag for every commit still
  pinned by a consumer. This keeps older checkouts reproducible and prevents Git hosting from
  garbage-collecting the pinned commit. Today the only consumer is the `src/experimental/` stack:
  the current development branch plus the `Cargo.lock` of every `experimental-agent/v*` release
  tag, since Cargo fetches Git dependencies by revision. Revisit this list when `src/experimental/`
  moves to its own repositories.
- The Microsandbox workspace version uses `<upstream-version>-digdir.<revision>`.
- `digdir-v<workspace-version>` points at the exact Microsandbox commit from which the downstream
  runtime assets were built.
- All internal Microsandbox crates use the same exact workspace version, and `Cargo.lock` agrees.
- The Microsandbox commit pins the intended private libkrunfw commit through
  `vendor/libkrunfw`.
- The `msb` host executable, embedded `agentd` and libkrunfw artifact come from the tagged
  Microsandbox runtime release revision.
- Altinn Studio normally pins that same release revision. A source-only descendant may instead use
  an immutable `digdir-source-v<runtime-version>-<consumer>` tag after verifying that it needs no new
  host runtime, guest agent, firmware or protocol behavior (see the check in step 7). Never pin an
  untagged follow-up commit.
- Altinn Studio records the SHA-256 digest of every supported host runtime bundle before the new
  source revision is merged.
- Existing release tags and assets are immutable. A correction gets a new Digdir revision.

The release dependency flows in one direction:

```text
stable Microsandbox tag
        +
Digdir libkrunfw patch queue
        +
Digdir Microsandbox patch queue
        |
        v
digdir-v<version> source tag and runtime assets
        |
        v
Altinn Cargo revision, lockfile and runtime SHA-256 pins
```

## Review gates

Tags and release assets are immutable and a published `main-digdir` is shared, so human review
belongs on the fork before the tag, not on the Altinn pull request.

1. **After triage (step 3).** Review the triage record before the rebase starts. Every wrong `drop`
   or misdirected `adapt` decision found later costs a rebase pass.
2. **Before the tag (step 6).** Review the `sync/digdir-X.Y.Z` pull request on the fork: the
   `range-diff` against the triage record, the complete tree diff from the upstream tag and the test
   results. Approval authorizes the `digdir-v*` tag.

The fork pull request description is a short summary for the reviewer: which triage decisions
changed during the rebase and why, what is not covered by tests, and what was verified where. Do
not paste the triage record, process notes, or anything the reviewer can read from the diff.

Text written to the forks, in commit messages, pull request titles and descriptions, and code or
workflow comments, must never contain `#<number>` references or GHSA identifiers. GitHub resolves a
bare `#123` in a fork against the upstream repository and records a cross-reference in that upstream
issue's or pull request's history, which is noise for the upstream maintainers. Cite an upstream
change by its short commit SHA, and refer to triage rows as "row 3", never "#3". Before pushing or
opening the pull request, check with `git log --format=%B <base>..HEAD | grep -E '#[0-9]+|GHSA'`
and the same grep over the description.

The Altinn pull request (step 7) only needs a check that the revisions, lockfile and digests agree
with the published release and that first-run installation was exercised from an empty home.

## 1. Refresh the upstream mirrors

Configure `origin` as the personal fork and `upstream` as the Super Rad Company repository. Fetch
branches and tags before comparing histories.

For Microsandbox:

```bash
git fetch origin
git fetch upstream --tags
git switch main
git merge --ff-only upstream/main
git push origin main
```

For libkrunfw, whose upstream default branch is `krunfw`:

```bash
git fetch origin
git fetch upstream --tags
git switch krunfw
git merge --ff-only upstream/krunfw
git push origin krunfw
```

Stop if either fast-forward fails. A mirror branch with fork-only commits must be inspected and
repaired rather than merged.

## 2. Select the stable Microsandbox base

Use the latest non-prerelease GitHub release unless a specific version has been selected for a
documented reason. Verify the release tag and record its commit. Do not use upstream `main` merely
because the mirror has been refreshed.

```bash
target_msb_tag=vX.Y.Z
git rev-parse "$target_msb_tag^{commit}"
```

Inspect the libkrunfw submodule revision selected by that release:

```bash
git ls-tree "$target_msb_tag" vendor/libkrunfw
git show "$target_msb_tag:.gitmodules"
```

That submodule revision is the libkrunfw base for a strict stable-release synchronization. Newer
commits on upstream libkrunfw are a separate upgrade decision and must not be included implicitly.

## 3. Triage the upstream changes

Most upstream commits do not affect this stack. Altinn Studio consumes the Rust SDK, the crates it
links (`image`, `network`, `filesystem` and, transitively, the rest of `crates/`), the guest agent,
the firmware submodule and the release workflow that produces the host artifacts. Documentation,
the other language SDKs, examples and package publishing are out of scope. Reduce the upstream
range to the commits that matter before touching the patch queue:

```bash
old_msb_base=$(git merge-base origin/main-digdir "$target_msb_tag")
git log --oneline --no-merges "$old_msb_base".."$target_msb_tag" -- \
  crates sdk/rust vendor/libkrunfw Cargo.toml Cargo.lock \
  '.github/workflows/release*.yml' scripts/ci \
  ':!**/*.md' ':!crates/*/examples' ':!crates/*/benches'
```

The release workflow paths are in scope because they decide how the published binaries are built.
An upstream change to the build container, linker baseline or artifact validation does not make
the downstream workflow fail; it silently makes the downstream artifacts differ from upstream's.
The 0.6.18 synchronization missed the upstream move to a glibc 2.28 baseline for exactly this
reason.

Then narrow further to the paths the downstream patches own, which forecasts the rebase conflicts
and reveals patches that upstream may have made redundant:

```bash
git diff --name-only "$old_msb_base" origin/main-digdir -- crates sdk/rust |
  xargs git log --oneline --no-merges "$old_msb_base".."$target_msb_tag" --
```

Read each remaining commit and write the result down as a triage record before starting the
rebase. The record is the handoff between triage, rebase and release, which may be done by
different people or in separate sessions. It stays in the sync notes; it is not the pull request
description (see the review gates). It contains:

- one row per downstream commit: subject, decision (`keep`, `adapt`, `drop`), the upstream commits
  that motivate the decision, and for `adapt` the new upstream API or file location to target;
- the upstream commits in the narrowed list that touch no downstream patch but change behavior the
  stack relies on, such as protocol, guest agent or firmware changes; and
- upstream refactors that moved or deleted files a patch touches, since `git rebase` reports those
  as delete/modify conflicts and the patch must be re-applied by hand at the new location.

For every upstream change to the release workflows, decide whether `release-digdir-runtime.yml`
must adopt it; it copies upstream's build steps and inherits none of their later fixes.

## 4. Rebase the libkrunfw patch queue

First compare the libkrunfw revision selected by the new tag with the base of the current downstream
queue:

```bash
git ls-tree "$target_msb_tag" vendor/libkrunfw
git -C vendor/libkrunfw merge-base origin/main-digdir upstream/krunfw
```

If the two commits are equal, upstream has not moved the firmware and this step is a no-op: keep the
existing `main-digdir` commit of libkrunfw and continue with step 5. This is the case for every
release from `v0.6.9` through `v0.6.18`.

Otherwise create a temporary branch from the existing downstream branch. Tag the old consumed tip
before rewriting or moving any published reference.

```bash
git switch -c sync/libkrunfw-X.Y.Z origin/main-digdir
target_libkrunfw_commit=REPLACE_WITH_RECORDED_COMMIT
old_libkrunfw_base=$(git merge-base origin/main-digdir "$target_libkrunfw_commit")
git rebase --interactive --onto "$target_libkrunfw_commit" "$old_libkrunfw_base"
```

During the rebase, retain only the kernel configuration and firmware behavior still required by the
Agent platform. Resolve generated kernel configuration changes deliberately; do not accept an entire
side of a conflict without checking every required option.

Review the rewritten patch queue:

```bash
git range-diff \
  "$old_libkrunfw_base"..origin/main-digdir \
  "$target_libkrunfw_commit"..sync/libkrunfw-X.Y.Z
```

Run libkrunfw's kernel configuration checks and builds for every supported guest architecture. The
Microsandbox release workflow builds firmware from this submodule, but it is not a substitute for
checking the rewritten libkrunfw commits themselves.

Push the temporary branch for review. Move `main-digdir` only after every still-consumed commit has
an immutable tag and the new patch queue passes its checks. Use `--force-with-lease` rather than an
unguarded force push if the integration branch must be moved to rewritten history.

## 5. Rebase the Microsandbox patch queue

Work on a temporary branch based on the current downstream tip:

```bash
git switch -c sync/digdir-X.Y.Z origin/main-digdir
git rebase --interactive --onto "$target_msb_tag" "$old_msb_base"
```

Apply the triage list from step 3 to every downstream commit. In particular:

- drop behavior that the selected upstream release now implements;
- adapt patches when upstream provides a new API for the same purpose;
- keep Altinn-specific network control, prepared-root, runtime isolation and runtime publication
  behavior separate where possible;
- keep functional patches separate from downstream version bumps and release plumbing;
- drop the previous `chore: bump downstream runtime` commit during the rebase and add a fresh one
  at the tip once every functional patch is in place; and
- preserve the ordering between protocol changes, the embedded guest agent and host runtime changes.

Update `vendor/libkrunfw` to the reviewed private libkrunfw commit from step 4. Do not
update the submodule to the tip of either libkrunfw branch without verifying its ancestry and content.

Finish with one downstream version such as `X.Y.Z-digdir.1`. Update every internal exact version and
regenerate `Cargo.lock`. The version suffix increments for any correction published from the same
upstream release.

Update the triage record when a decision changes during the rebase, so that the record and the
final `range-diff` agree.

Compare the old and new patch queues before publishing:

```bash
git range-diff \
  "$old_msb_base"..origin/main-digdir \
  "$target_msb_tag"..sync/digdir-X.Y.Z
```

Also inspect the complete tree difference from the upstream tag. `range-diff` explains rewritten
commits; it does not reveal an accidentally retained generated file or submodule pointer by itself.

## 6. Validate and publish the downstream runtime

Run the Microsandbox repository's focused checks for every touched crate, followed by its workspace
checks. Runtime, networking, filesystem, image and protocol changes require the hardware-backed
integration tests on supported hosts. A compile-only result does not establish that the host and
guest protocol still agree.

Before tagging, verify all of the following:

- the workspace and internal crate versions are identical;
- `Cargo.lock` is current;
- `vendor/libkrunfw` is initialized at the committed private revision;
- the downstream release workflow accepts the version and submodule remote;
- the runtime download helpers use the downstream release repository and tag scheme; and
- no build uses an old `agentd`, `msb` or libkrunfw artifact from a local cache.

Create `digdir-v<workspace-version>` at the reviewed source commit. The downstream release workflow
builds and publishes the host bundles, standalone guest agents and libkrunfw artifacts for Linux
x86_64, Linux aarch64, macOS aarch64, Windows x86_64 and Windows aarch64. It only builds and
checksums; it does not start a sandbox on any of them, so the runtime tests above are the only
execution coverage a release gets. Treat a partially
published or failed release as unusable and publish a corrected Digdir revision instead of replacing
assets.

Download the published checksum manifest and independently verify each runtime bundle. For the
Linux bundles also confirm the glibc baseline by listing the `GLIBC_*` versions the binaries
import; the release workflow's validator gate must have run, but check the artifact itself. Record the
bundle SHA-256 values for Linux x86_64, Linux aarch64, macOS aarch64, Windows x86_64 and Windows
aarch64. If the supported platform matrix changes, update both the downstream release validation and
Altinn Studio's digest table in the same change.

## 7. Update Altinn Studio

Only update Altinn Studio after the downstream runtime release is complete and verified, or after a
source-only descendant has been audited as compatible with the already verified runtime release.

1. Update every `microsandbox*` Git revision together in the root `Cargo.toml`.
2. Regenerate the root `Cargo.lock` and confirm every Git-sourced Microsandbox package resolves to
   the same revision and downstream version.
3. Search the repository for every remaining reference to the previous pin. For a runtime release,
   replace the previous version, revision and bundle digests. For a source-only update, replace the
   source revision but keep the compatible runtime version and bundle digests unchanged. Do not rely
   on a list of known files; search for the identifiers themselves:

   ```bash
   git grep -n -e '<previous-downstream-version>' -e '<previous-revision-sha>'
   git grep -n -F -f <(printf '%s\n' <previous-bundle-digests>)
   ```

   Runtime-release hits include the runtime bundle digest table in
   `sandbox-microsandbox/src/client.rs`, container images that download the runtime bundle (CI fails
   on any skew between such a pin and `Cargo.lock`), and comments that name the pinned downstream
   version. For a source-only update, verify those runtime references still match the compatible
   `digdir-v*` tag. Repeat the source-revision search until it returns only this runbook and changelog
   history.

4. Confirm that the Cargo revision is tagged by either the corresponding `digdir-v*` release or an
   explicitly runtime-compatible `digdir-source-v*` tag. Start a source-only audit with the complete
   diff from the runtime tag:

   ```bash
   git diff --stat digdir-v<runtime-version>..digdir-source-v<runtime-version>-<consumer> -- .
   ```

   Changes confined to `sdk/rust` are normally source-only. Shared host libraries under `crates/`
   may also qualify when the consumer pull request records that the changed production symbols are
   reached only from the embedded host SDK, the existing runtime does not execute the changed path,
   and protocol and artifact behavior are unchanged. This explicit audit is required because the
   repository paths alone do not identify which binary executes shared library code.

   A new Digdir runtime revision is required for changes used by the published `msb`, embedded
   `agentd`, libkrunfw or firmware artifacts, or for changes to the host/guest protocol, release
   workflow or artifact composition. Tests alone may change without a runtime release when their
   non-test code is untouched.

5. Run the experimental formatting, lint, build and unit-test targets.
6. Run the ignored Microsandbox end-to-end tests on hosts with Docker, Internet access and hardware
   virtualization.
7. Exercise first-run runtime installation from an empty provider home so stale local artifacts
   cannot mask a release or checksum error, and separately exercise an upgrade from a provider home
   and database populated by the previously pinned version, since migrations only run there.
8. Run `yarn spell:quick` for the changed documentation and source files.

The Altinn change is internal maintenance unless it changes behavior visible to Agent users. Use the
`skip-changelog` label for internal-only synchronization; otherwise describe the user-visible effect
under `Unreleased` in `CHANGELOG.md`.

## Rollback

Rollback is an Altinn pin change, not a mutation of an existing downstream release. Restore the
previous tagged Microsandbox revision, lockfile resolution and matching runtime digest table
together. Do not combine source from one downstream version with runtime artifacts from another.

Keep the failed downstream source tag and release for diagnosis. Publish a new Digdir revision when
the problem is corrected.

## Future upstream contributions

Upstream contribution branches are separate from downstream synchronization. Start them from the
current upstream default branch and cherry-pick one coherent downstream change at a time. Do not
merge those branches back into `main-digdir`; a later stable upstream release brings accepted work
back into the downstream base, where the corresponding patch can be dropped or reduced.
