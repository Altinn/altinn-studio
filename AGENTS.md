# AGENTS.md

This file provides guidance to AI agents working anywhere in this repository. It is the top of a
hierarchy: every major area has its own `AGENTS.md` with more detail, and the deeper you go, the more
specific the guidance becomes.

## Altinn Studio

Altinn Studio is a product for developing, operating, and managing public digital services for citizens
and businesses in Norway. It runs on a secure, isolated, scalable platform integrated with common shared
services and open APIs, and supports both user-facing submissions and machine-to-machine APIs.

You can build anything from simple form services to complex workflows with payments and signing. It is a
hybrid of low-code and traditional code, so you can start in Designer and switch to full-code tools when
needed. Key principles: open source, open standards, cloud-based infrastructure, modern frameworks,
built-in security, and tenant isolation.

Docs: https://docs.altinn.studio/nb/altinn-studio/v8/about/

### The three pillars of Altinn 3

- **Altinn Studio** — the tooling where developers build and deploy apps (the Designer product).
- **Altinn Apps** — the runtime an individual deployed service is built on (backend libraries + frontend).
- **Altinn Platform** — the shared cloud services apps depend on (Storage, Process, Authorization, …),
  emulated locally by `localtest`.

This monorepo contains the Studio tooling, the App runtime libraries, several runtime/platform services,
developer tooling, and the supporting infrastructure to run it all.

## Repository map

Product code and shared libraries live under `src/`.
Each area below links to its own `AGENTS.md` where one exists.

### Product surfaces

| Area                                     | What it is                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/Designer`](src/Designer/AGENTS.md) | **Altinn Studio Designer** — React + .NET web app where users build apps (forms, data models, policies, BPMN processes). Split into [`backend`](src/Designer/backend/AGENTS.md) (.NET) and [`frontend`](src/Designer/frontend/AGENTS.md) (React/TS).                                                                                                                                      |
| [`src/App`](src/App/AGENTS.md)           | The **Altinn 3 app runtime** every deployed service builds on: [`backend`](src/App/backend/AGENTS.md) (Altinn.App .NET libraries), [`frontend`](src/App/frontend/AGENTS.md) (React form renderer), plus support libs [`codelists`](src/App/codelists/AGENTS.md), [`fileanalyzers`](src/App/fileanalyzers/AGENTS.md), the [`template`](src/App/template/AGENTS.md), and `azure-pipelines`. |

### Runtime & platform services — [`src/Runtime`](src/Runtime/AGENTS.md)

.NET and Go services supporting apps in production and local dev (one-liners + stacks in the area doc):
[`workflow-engine`](src/Runtime/workflow-engine/AGENTS.md) (+ its host
[`workflow-engine-app`](src/Runtime/workflow-engine-app/AGENTS.md)),
[`gateway`](src/Runtime/gateway/AGENTS.md), [`operator`](src/Runtime/operator/AGENTS.md),
[`pdf3`](src/Runtime/pdf3/AGENTS.md), [`localtest`](src/Runtime/localtest/AGENTS.md),
[`devenv`](src/Runtime/devenv/AGENTS.md), and
[`kubernetes-wrapper`](src/Runtime/kubernetes-wrapper/AGENTS.md).

### Developer tooling

| Area                               | What it is                                                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`agents`](agents)                 | Published Altinn development Agent images and manifests, with minimal and full toolchain variants.                                                                                                               |
| [`src/cli`](src/cli/AGENTS.md)     | **`studioctl`** — the primary local-dev CLI (Go + an embedded .NET companion server) for cloning, running, and testing apps locally.                                                                              |
| [`src/tools`](src/tools/AGENTS.md) | Standalone tools: [`deployer`](src/tools/deployer/AGENTS.md), [`releaser`](src/tools/releaser/AGENTS.md), [`altinn-fleet-stats`](src/tools/altinn-fleet-stats/AGENTS.md), [`health`](src/tools/health/AGENTS.md). |

### AI — [`src/AI`](src/AI/AGENTS.md)

R&D projects from the AI lab (to be handed off to the Studio team): `agents` (Altinity natural-language
app builder) and `augmenter-agent` (document/PDF augmentation microservice).

### Experimental — [`src/experimental`](src/experimental/AGENTS.md)

Early agent-platform architecture with a reusable sandbox SDK and a separate agent automation layer.

### Continuous integration — [`src/ci`](src/ci/AGENTS.md)

Runner images and cluster integration used to execute GitHub and Gitea CI workloads.

### Shared code

| Area                                                 | What it is                                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/common`](src/common/AGENTS.md)                 | Repository-wide common code grouped by stack, including `Altinn.Studio.Common` and shared TypeScript libraries.                        |
| [`src/Runtime/common`](src/Runtime/common/AGENTS.md) | Runtime-wide common code grouped by stack, including `Altinn.Studio.Runtime.Common` and its cross-language local-runtime capabilities. |

### Testing — [`src/test`](src/test/AGENTS.md)

`K6` load/performance scripts and `apps` (sample Altinn apps used as E2E/frontend test targets).

### Infrastructure (Docker/ops)

Small build/ops images and configs, documented here rather than individually:

- `gitea` — custom image for the self-hosted Gitea (Studio's "Repositories" Git server).
- `gitea-proxy` — nginx+njs proxy restricting Gitea API-key/basic-auth to git + REST API only.
- `lhci-server` — Lighthouse CI server (Node + Postgres) tracking frontend performance.
- `load-balancer` — nginx edge proxy (with OpenTelemetry) fronting Studio services; local + k8s configs.

Other top-level dirs: `charts/` (Helm), `infra/` (deployment infra), `docs/` (ADRs, diagrams),
`scripts/`, [`.github/`](.github/AGENTS.md) (workflows + composite actions, incl. the CI caching
architecture and its cross-repo couplings), and root Docker/compose files for the Designer dev
stack (see `README.md`).

## Conventions across the repo

- **Changelogs:** Changelog entries are release notes for product users. Describe only user-facing
  functionality in clear language, and omit implementation details that do not affect product use.
  Technical language is appropriate when it helps users understand or adopt the change.
- **Spelling and language:** Code is **US English** — identifiers, comments, doc comments, log and
  exception messages, docs, and translation _keys_ (a key is a code contract). Text a user reads in
  the product is **British English** for the English values and checked **Norwegian** (bokmål and
  nynorsk, via hunspell + Norsk Ordbank) for the `nb`/`nn` values. Run `yarn spell:quick` for fast
  feedback on your changed files, `yarn spell:check` for everything, and `yarn spell:fix` to apply
  unambiguous corrections — note that the fix mode also edits misspelled _identifiers_, which is a
  semantic change, so always review the diff. CI runs the same checks in
  `.github/workflows/spellcheck.yaml`; the pre-commit hook runs `spell:quick` on staged files. The
  check is deliberately **not** wired into `dotnet build`/`tsc` — a spelling finding should never
  slow or break a compile, and CI is the gate.

  The harness lives in `scripts/spellcheck/`. Its one hard rule: **no check may pass without
  proving it ran** — every check counts its work, tool exit codes are inspected, a committed
  self-test plants one of every defect class and asserts the production configuration catches
  each one, and every check runs independently so a failure in one cannot hide another.

  `typos.toml` is **engine configuration only** and holds no named exceptions, and its excludes
  cannot rot: a glob that matches no tracked file fails the coverage check unless declared
  precautionary (with a reason) in `registry.mjs`. Every accepted
  spelling lives in `scripts/spellcheck/suppressions.txt`, scoped to the paths — and where
  possible the exact identifiers — where it is load-bearing, with the reason in a comment. The same token outside
  its scope is still reported, and an entry that matches nothing is reported as stale. For this
  reason never run bare `typos` (it reports accepted contract spellings) and never run
  `typos --write-changes` (it would "fix" them); `spell:quick`/`spell:check`/`spell:fix` apply the
  registry. Test-only surface (test projects, colocated `*.test.*`/`*.spec.*` files, test data,
  mocks, e2e suites, Storybook stories) is out of scope wholesale — never add a suppression for a
  test file. Norwegian text inside a string literal in code is recognized and skipped by the
  runner's classifier, as are tokens inside base64/JWT data runs and word tails after a bracket
  expression (`*.[Pp]ublish.xml` in a `.gitignore`) — a Norwegian word in an identifier or in
  markup text is still reported and must be fixed or suppressed.

  Every file holding user-facing translation text is declared once, in
  `scripts/spellcheck/registry.mjs`. Add new language files there; the coverage check fails when a
  language-file-shaped path is neither registered nor explicitly out of scope, and when a
  registered file is not excluded from the code pass in `typos.toml`. The coverage check finds
  files by the naming patterns in `SCAN_PATTERNS` — a language file that starts a **new naming
  convention** is invisible to it, so add the new pattern in the same change. Translation text
  embedded inline in a code file cannot be found by any pattern and must be registered by hand.

  When a check flags something, prefer fixing the spelling. If a Norwegian domain term is genuinely
  correct, add it to `scripts/spellcheck/glossary.nb.txt` / `glossary.nn.txt` (the dictionary is
  full-form, so inflections need their own lines); language-neutral tokens — names, quoted
  identifiers, formats — go in `glossary.shared.txt`, which both languages accept. A glossary
  entry that no longer rescues any flagged word is reported as stale. If an English spelling
  genuinely cannot change
  (a wire contract, someone else's API), add a scoped entry to `suppressions.txt`. Deliberate
  facts about a specific translation **entry** are declared per key in
  `scripts/spellcheck/keys.txt`: `@empty` (the value is intentionally blank), `@key-contract`
  (the key's spelling is a code contract — an ISO code, a name keyed by a wire value — while its
  value stays checked), and `@language nb|nn` (the value is deliberately in the other Norwegian
  language and is checked with **that** language's dictionary rather than skipped). Like
  suppressions, every declaration is scoped to files and reported as stale once it stops doing
  work. Each registry file's header documents its exact grammar; keep entries alphabetized
  within their sections (Norwegian collation — æ, ø, å last — in the Norwegian glossaries), and
  a failing run prints where each kind of exception belongs. Note that
  `typos` does **not** look inside path-shaped string literals, so after renaming a directory you
  must also `git grep` the old segment.
- **Docs:** `AGENTS.md` is the source of truth for agent guidance in a directory. Where a `CLAUDE.md`
  exists alongside it, that file just links to the `AGENTS.md` (`@AGENTS.md`) so Claude Code loads it.
  Never leave a directory with only a `CLAUDE.md` — always create the `AGENTS.md` and point `CLAUDE.md`
  at it. These invariants (pairing, resolvable links, root-map coverage of tracked directories) are
  enforced by `yarn docs:validate` in CI.
- **Languages/stacks vary by project:** .NET (C#), React/TypeScript, Go, and Python all appear here.
  Framework versions differ per project and are documented at the leaf, not here — check the project's
  own `AGENTS.md`, `global.json`, `go.mod`, or `pyproject.toml` before assuming a version.
- **Formatting/linting is enforced at build time** in most projects (CSharpier for .NET, ESLint/Prettier
  for TS, golangci-lint for Go). Follow the commands in the project's `AGENTS.md`/`Makefile`.
- **Prefer the guidance closest to the code.** More-specific `AGENTS.md` files override this one.
