# Architecture Decision: Retire the MCP Server — Library + Skills Instead

**Status:** Ruled (rev 4 final). Migration Phases 1–3 executed 2026-07-08
(library extracted, agent fully rewired + MCP client stack deleted,
183 tests green). Remaining: Phase 4 (infra retirement after grace
period), Phase 5 (external skills publication), `codegen/` disposition.
**Date:** 2026-07-08 (revised same day — see §0)
**Deciders:** AI Lab (pre-handoff to the Altinn Studio team)

---

## 0. Correction log

**2026-07-08 (rev 2).** The original analysis (rev 1) concluded the MCP
server was cluster-internal only ("ClusterIP, no Ingress") and therefore
unreachable by external developers. **That finding was wrong.** The
ingress routing lives in the cluster's shared configuration outside this
repository, which a repo-scoped search could not see. Empirical probe:

```
POST https://altinn.studio/mcp/sse  (initialize)
→ 200, serverInfo: { name: "altinn_mcp", version: "2.0.0" }
```

The server IS deployed and publicly reachable. Additionally, the
original reading of "no evidence of external usage" is confounded: the
agent (and its ecosystem) is in beta and the endpoint has not been
promoted, so absence of usage is expected regardless of future demand
and cannot carry the decision.

Rev 1's ruling ("absorb and retire the server") over-reached on that
faulty premise. The revised ruling (§4) keeps the part of the analysis
the correction does not touch — de-coupling the _agent_ from MCP —
and replaces "retire the server" with "rebase the server on the shared
library and keep it as the public channel," plus a new distribution
idea: publishing the skills for external installation (§3.5).

**2026-07-08 (rev 3).** Reasoning cleanup after a second review: rev 2
still leaned on absence-of-usage arguments in places ("consumers that
don't exist", "external demand is unknowable"). The correct timeline
framing: **the entire product is pre-beta** — the agent is not publicly
available, and the external MCP launch is planned to ship _with_ the
agent's beta. Zero current usage is what a pre-launch calendar looks
like and carries no information about demand. All usage-based
reasoning (for or against the server) has been struck from the
decision basis; the ruling now rests exclusively on architecture costs
(§2.2–2.3), industry practice (§2.4), and the planned product shape
(§2.1). The ruling itself is unchanged from rev 2.

**2026-07-08 (rev 4 — FINAL).** Product-owner decision: **retire the
MCP server.** The skillability audit (§4.2) had left two "hosted is
better" holdouts; both were then verified skillable:

- `altinn_layout_list` — the component-library repo allows **anonymous
  git clone** (verified; the REST API requires auth, but a skill
  instructs the agent to clone the public repo instead — richer access
  than the API wrapper gave).
- Doc search — the hand-rolled crawl/index engine (604 LOC) was
  compensating for the absence of a curated index. A curated
  `llms.txt` (106 entries, title + URL + description) now exists;
  the langfuse-skill pattern (scan index → fetch page) replaces the
  server-side engine, with the model as the ranking function.

The remaining hosted-MCP advantages (web/desktop chat clients,
zero-setup URL, telemetry, always-current versions) are **accepted
trade-offs** by the product owner for this audience. The external
channel is published skills only. The resurrection path stands: the
extracted library keeps every capability importable, and a thin
fastmcp adapter over it remains an afternoon of work if a hosted
channel is ever wanted.

---

## 1. The question

We maintain two deployable systems:

- **Altinity agent** (`src/AI/agents`) — the agentic loop that turns natural-language goals into Altinn app changes.
- **MCP server** (`src/AI/mcp`) — 16 tools over the MCP protocol: Altinn documentation, validators, codegen, doc search.

After moving the static documentation tools into agent-local skills, the
question became unavoidable: **does the standalone MCP server still earn
its existence, or are we maintaining two systems where one would do?**

This document records the evidence, the options, and the ruling.

---

## 2. Evidence

### 2.1 Who actually consumes the MCP server?

The positioning in `src/AI/AGENTS.md` — _"MCP server — Altinn App
tools, used by Altinity and developers working directly with app
code"_ — describes a dual audience. We established what that means
operationally.

**Product timeline (the key fact).** The whole system is **pre-beta**:
the agent is not publicly available yet, and the external MCP launch is
_planned to coincide with the agent's beta_. Any observation about
current usage — internal or external — is therefore an observation
about the calendar, not about demand. **No usage-based argument, in
either direction, may carry this decision.**

**What the audit established (facts, not decision evidence):**

| Observation                 | Finding                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public reachability         | **Live at `https://altinn.studio/mcp/sse`** (verified by MCP initialize handshake, `altinn_mcp v2.0.0`). The repo-visible k8s Service is ClusterIP; the public routing lives in shared cluster ingress config outside this repo.                                                                                                                                                                                    |
| External-audience readiness | The README carries client-config examples for Cursor, VS Code, Windsurf, Claude Code, and Claude Desktop; Langfuse tracing attributes non-agent consumers via an `x-hackathon-name` header (`server/tracing.py:121-129`). One pilot use exists (the "brukerrådet" hackathon, commit `bf8f3e0eca`) — evidence the external channel is _anticipated and has been exercised_, consistent with the planned beta launch. |
| Configured consumers today  | One: the agent (`agents/infra/kustomize/deployment.yaml`) — expected pre-beta.                                                                                                                                                                                                                                                                                                                                      |
| Launch hygiene gaps         | README is stale (wrong port 8069 vs actual 8070; documents removed tools `studio_examples_tool` / `app_lib_examples_tool`; outdated project-structure section) and the public endpoint has no auth/rate limiting — items to fix **before** the beta launch, not arguments about the architecture.                                                                                                                   |

**Conclusion:** the external channel is real, live, and _planned_ — it
is a product feature the architecture must serve well, not an
open question the architecture gets to bet on. The decision must
therefore rest entirely on the costs and structures that are true
regardless of adoption (§2.2–2.4).

### 2.2 What does the MCP server actually contain?

~12,460 Python LOC + ~7,000 lines of static content, decomposing as:

| Category                           | LOC                                   | Notes                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real domain logic**              | ~2,700                                | Datamodel converters (JSON Schema → metamodel → XSD/C#), layout/resource validators, XACML policy parsing, doc-search engine. **None of it imports MCP types** — only 6 of ~45 files in `server/` touch the protocol at all. |
| **MCP protocol plumbing**          | ~2,500                                | 1,211 lines of `wrapper.py` shims, tool registry, tracing, auth, router/help tools. The router and help tools exist purely as UX affordances for _human-driven MCP clients_ — an in-process agent needs none of it.          |
| **Orphaned `codegen/` subproject** | 3,047                                 | Not registered as any tool; zero imports from `server/`. Leftover backend of removed tools. Still shipped in the Docker image, dragging langchain/langgraph/scikit-learn/numpy into the dependency tree.                     |
| **Static content**                 | ~7,000 lines + 2,913-line `static.py` | The doc blobs (already mirrored to agent skills), the 349KB search corpus, policy role data.                                                                                                                                 |

**Conclusion:** the valuable core is ~2,700 LOC of clean,
dependency-light Python that extracts into a library trivially. The
~2,500 LOC of protocol plumbing is legitimate _for the external
channel_ (router/help tools are UX for human-driven MCP clients) —
but it is pure overhead on the agent's path, and the 3KLOC `codegen/`
orphan serves no one.

### 2.3 What does the split cost the agent?

The agent carries **~1,340 production LOC + ~450 test LOC** purely to
talk to MCP: connection lifecycle with two retry loops, disconnect
detection by string-matching exception text, docs-readiness polling,
a pydantic schema-passthrough hack, and **five duplicated
implementations of "unwrap an MCP CallToolResult"** (`mcp_client.py`,
`mcp_verification.py` (dead code), `mcp_tool.py`, `verify_tool.py`,
`assistant_node.py`).

Worse than the code volume are the **failure modes the network hop
creates**:

1. **Workflow-start 503** — `api/routes/agent.py:63-75` refuses to
   start any workflow when MCP is unreachable.
2. **Chat-mode hard fail** — `assistant_node.py` raises on first
   connect if MCP is down; every chat turn also blocks up to 120s on
   docs-indexing readiness.
3. **The commit-blocking spiral** — `verify_changes` calls MCP
   validators and _fails closed_ on transport errors;
   `commit_session_branch` refuses to commit unverified files. A
   mid-session MCP outage therefore makes all layout/resource work
   uncommittable, even though each layer individually "degrades
   gracefully."

Every one of these disappears when validation is an in-process function
call.

### 2.4 What is the industry doing? (researched 2026-07-08)

The 2026 consensus, across sources:

- **Skills + scripts is the capability-extension pattern.** A skill is
  a folder: `SKILL.md` instructions + optional executable scripts the
  agent runs. Anthropic's own document skills work this way; OpenAI's
  Codex CLI adopted the same structure. Skills' progressive disclosure
  directly answers MCP's context-bloat problem (tool definitions
  consuming 50–1,000+ tokens each, always loaded).
- **MCP is not dying — it's repositioning.** 97M monthly SDK downloads,
  donated to the Linux Foundation's Agentic AI Foundation. But the
  guidance for _internal_ tools has hardened: **"MCP's value is
  proportional to how many boundaries it crosses"** (teams, agents,
  model providers, organizations). Same team + same repo + one
  consumer = zero boundaries = the protocol layer is middleware around
  middleware.
- **The hybrid ruling everyone converges on:** in-process function
  calls for app-specific logic owned by the same team; skills for
  domain knowledge and procedures; MCP for systems you _don't_ control
  and for exposing your tools to _other people's_ agents.

Sources: [Agent Skills vs MCP deep dive](https://medium.com/codetodeploy/the-agentic-stack-a-deep-dive-into-agent-skills-vs-model-context-protocol-mcp-9f378ce0db14),
[MCP vs Agent Skills (Analytics Vidhya)](https://www.analyticsvidhya.com/blog/2026/04/mcp-vs-agent-skills/),
[Why MCP + Skills works (AAIF)](https://aaif.io/blog/closing-the-context-gap-why-mcp-skills-works/),
[When to use MCP vs API vs function calls](https://jamwithai.substack.com/p/when-to-use-mcp-vs-api-vs-functiontool),
[CLI vs MCP for agents](https://jannikreinhard.com/2026/02/22/why-cli-tools-are-beating-mcp-for-ai-agents/),
[MCP vs CLI (MindStudio)](https://www.mindstudio.ai/blog/mcp-servers-vs-cli-tools-for-ai-agents).

### 2.5 The handoff constraint

These projects transfer to the Altinn Studio team. Their cost of
ownership is a first-class criterion. Two deployables (two Dockerfiles,
two k8s deployments, two dependency trees, a cross-service content-sync
mechanism, and a connection-management layer) versus one deployable
plus a folder of markdown-and-scripts the team can extend without
touching Python plumbing.

---

## 3. Options considered

### Option A — Status quo: two systems + sync mechanism

Keep the MCP server as-is; agent consumes the remaining 8 tools over
the network; `sync_skills.py` keeps doc content aligned.

- ✅ No migration work.
- ❌ Permanently pays the ~1,800-line MCP-client tax and all three
  failure modes — on the _internal_ path, where the protocol crosses
  no boundary.
- ❌ The domain logic stays trapped behind the protocol layer, so the
  agent's most availability-critical operation (verify → commit)
  depends on a network hop to the team's own code.
- ❌ Two full deployables through the handoff, with the heavier one
  (the server) carrying the domain logic that the agent needs most.

**Rejected:** the recurring agent-side costs are architectural, not
usage-dependent — they exist at any adoption level, including a wildly
successful external launch. Option C keeps every external benefit
while removing them.

### Option B — Absorb domain logic into the agent; retire the standalone server

Move the ~2,700 LOC of clean domain logic into the agent as an internal
library. Loop tools call it directly. Delete the agent's MCP client
stack AND the MCP server deployment.

**Rejected in rev 2, ADOPTED in rev 4** — with the reasoning repaired.
Rev 1 justified retirement with the (incorrect) unreachability finding
and absence-of-usage arguments; rev 2 rightly rejected that basis. Rev
4 adopts the same end state on valid grounds: a completed skillability
audit (every tool has a skill form — §4.2), a verified curated
`llms.txt` replacing the doc-search engine, verified anonymous clone
access for component examples, and an explicit product-owner decision
to accept the hosted channel's trade-offs (§0 rev 4). The lesson the
revision history preserves: right ruling, wrong reasons in rev 1 —
both had to be fixed independently.

### Option C — Shared library; agent goes in-process; MCP server becomes a thin adapter _(rev 2–3 ruling, superseded by rev 4)_

Extract the domain logic into a shared package. The agent imports it
directly (in-process tools — no network hop, no MCP client). The MCP
server keeps existing as the public channel, rebased to a thin fastmcp
adapter over the same library.

- ✅ All agent-side wins of Option B: deletes ~1,300 production +
  ~450 test LOC of connection plumbing, five duplicate
  result-unwrappers, the 503 gate, the chat hard-fail, and the
  verify→commit blocking spiral.
- ✅ Keeps the live public channel; the beta-launch question stays a
  product decision with zero architectural pressure.
- ✅ Single implementation of every validator/converter — the drift
  problem between two codebases never exists.
- ✅ The MCP server _shrinks_ dramatically: wrappers/router/help stay
  (they're the human-client UX), but all domain logic moves out; the
  orphaned `codegen/` and its heavy deps go regardless.
- ❌ Still two deployables — but the second one becomes thin, changes
  rarely (only when the library API changes), and is justified by a
  real, live endpoint rather than an aspiration.
- ❌ Requires solving cross-project imports in the monorepo (both
  Docker build contexts are project-scoped today). See §5 Phase 0.

### Option D — Runtime skill/tool fetch from MCP

Agent pulls capabilities from the MCP server at session start.

**Rejected:** reintroduces the network dependency we're eliminating,
makes skills unversionable with the agent, and inverts the direction
the industry is moving (local-first capabilities, progressive
disclosure).

### 3.5 New (rev 2): distribute skills to external developers via the public repo

altinn-studio is a public repository. The skills we built for the agent
(`agents/skills/altinn-*`) are exactly the artifact external developers
want in their own environment — and the ecosystem has a standard
install pattern for this (cf. `langfuse/skills`):

```bash
npx skills add altinn/altinn-studio --skill altinn-datamodel
# or: clone + symlink into ~/.claude/skills / .cursor/skills
```

This gives external developers a **second, zero-hosting channel**:

- **Skills** (knowledge + eventually scripts): installed locally,
  versioned by the repo, work offline, run in the developer's own
  Claude Code / Cursor / Windsurf.
- **Hosted MCP** (`altinn.studio/mcp/sse`): the zero-setup channel for
  live compute — validators, doc search, datamodel sync — for clients
  that can't or shouldn't run scripts locally.

The two channels are complementary (the industry's "skills = playbooks,
MCP = tools" split), and both are served by the same library +
content, so adding the skills channel costs little: a top-level
`skills/` convention (or docs pointing at `src/AI/agents/agents/skills/`),
install instructions in the README, and keeping frontmatter
descriptions client-agnostic.

---

## 4. Ruling (rev 4 — final)

**Retire the MCP server. The agent absorbs the domain logic as an
internal library; skills — published in the public repo for local
installation — become the sole external channel.**

What carries the decision:

1. The split **actively harms the agent** (~1,800 LOC of plumbing,
   three outage-induced failure modes including blocked commits), and
   that harm is independent of whether external consumers exist —
   §2.3. **The agent must stop consuming its own team's code over a
   network protocol.**
2. The valuable logic is **already clean Python** that doesn't know
   MCP exists (~2,700 LOC, 6/45 files touch protocol types) — the
   internal library is nearly free — §2.2.
3. **Every tool is skillable** (§4.2 audit + rev-4 verification of the
   last two holdouts). Validators are small scripts; policy tooling is
   a script + data file; datamodel converters are stdlib-only Python
   that ships in a skill's scripts dir; component examples come from an
   anonymously clonable public repo; doc search collapses to a curated
   `llms.txt` + fetch (the langfuse-skill pattern).
4. The hosted channel's genuine advantages (web/desktop chat clients,
   zero-setup URL, telemetry, always-current) are **consciously traded
   away** by the product owner for this audience (§0 rev 4). Skills
   reach the primary audience — developers in agentic coding
   environments — with less maintenance and no hosting.
5. The trade is **cheaply reversible**: the library keeps every
   capability importable; a thin fastmcp adapter over it is the
   sanctioned resurrection path if hosted demand ever materializes.

One implementation, two channels, one deployable:

```
        agents' internal library (validators, converters, gitea/layout examples)
                 ↑ in-process tools
        Altinity agent ── the only deployed service

        skills/ (knowledge + scripts + llms.txt doc index)
                 ↑ agent's skill tool          ↑ external devs install locally
                                                  (public repo, langfuse/skills pattern)
```

### 4.1 Disposition of the MCP project (rev 4)

Nothing remains deployed. Disposition of each part:

| Part                                                                                         | Fate                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain logic (~2,700 LOC: converters, metamodel, validators, policy summarize + `static.py`) | → agent-internal library (`agents/agents/altinn/`) — powers the in-process tools. Converters additionally ship as scripts in the datamodel skill for external users. |
| `doc_search.py` (604 LOC crawl/cache/index engine)                                           | **Deleted.** Superseded by the curated `llms.txt` + fetch pattern for both the agent and external users.                                                             |
| `llms.txt` (curated, 106 entries)                                                            | → the new `altinn-docs` skill — the doc-navigation index.                                                                                                            |
| `*_context.md` doc content                                                                   | → canonical home moves into the agent repo (skills become the single source; `sync_skills.py` drops its cross-project direction).                                    |
| `altinn_layout_list` Gitea wrapper                                                           | **Deleted.** The layout skill instructs: anonymous `git clone` of the public component-library repo (verified working) — richer than the API wrapper.                |
| Protocol plumbing (~2,500 LOC: wrappers, registry, router/help tools, tracing, auth, main)   | **Deleted with the server.** It existed to serve hosted MCP clients; there are none in the end state.                                                                |
| Orphaned `codegen/` (3 KLOC + heavy deps)                                                    | Parked in `attic/` or deleted — owner's call; it serves no tool either way.                                                                                          |
| Deployment (dockerfile, kustomize, Flux sync, deploy workflow, `altinn.studio/mcp/sse`)      | **Removed.** Grace period + Langfuse trace watch before the final ingress removal, in case an unknown consumer surfaces.                                             |
| `src/AI/mcp` directory                                                                       | Archive after library extraction (git history preserves everything).                                                                                                 |

### 4.2 The skillability audit (and the channel trade-off, decided in rev 4)

Every tool passed the "could this be a skill?" test once verified:

| Tool                                                  | Skill form                                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `altinn_layout_validate` / `altinn_resource_validate` | ~50-line scripts (jsonschema vs CDN schemas) in the layout/resource skills                                                              |
| `altinn_layout_props`                                 | Skill teaches fetching the public schema URL directly                                                                                   |
| `altinn_policy_summarize` / `_validate`               | Script + role-data file in the policy skill; `_validate` was already "instructions for the client LLM" — i.e. a skill in disguise       |
| `altinn_datamodel_sync`                               | Converters are stdlib-only Python → scripts in the datamodel skill (external); library call (agent)                                     |
| `altinn_layout_list`                                  | Skill instructs anonymous `git clone` of the public component-library repo (verified)                                                   |
| `altinn_planning` doc search                          | `altinn-docs` skill: curated `llms.txt` (106 entries) + fetch — the model outperforms the hand-rolled keyword index as ranking function |
| `altinn_*_docs` / `help` / `route`                    | Already skills                                                                                                                          |

What retiring the hosted channel gives up — accepted consciously
(§0 rev 4): web/desktop chat clients (claude.ai, Claude Desktop,
ChatGPT connectors) cannot consume skills-with-scripts; zero-setup
URL adoption (the hackathon pattern); central version currency;
consumer telemetry. If any of these become product requirements, the
resurrection path is a thin fastmcp adapter over the library.

---

## 5. Migration plan (rev 4)

Phased so every step ships green and the system runs throughout. With
the server retired, no cross-project sharing is needed — the library
lives inside the agent project, which removes rev 2's Phase 0 entirely.

**Phase 1 — extract the library into the agent (no behavior change)**
Move the clean modules to `agents/agents/altinn/`:
`converters/` + `metamodel/` (datamodel sync), `schema_validator`,
`layout_properties`, `resource_validator`, `policy_summarize`
(+ `static.py` data). Add deps (jsonschema, defusedxml). Port or write
unit tests alongside. (`doc_search.py` is NOT ported — superseded by
the `llms.txt` skill.) Move the canonical `*_context.md` content into
the agent repo; `sync_skills.py` drops its `../mcp` direction.

**Phase 2 — rewire the agent's tools**

- `verify_changes` → call validators directly (delete the MCP
  transport/fallback branches and fail-closed-on-transport logic).
- New in-process `Tool` subclasses: `altinn_layout_props`,
  `altinn_layout_validate`, `altinn_datamodel_sync`.
- New `altinn-docs` skill (curated `llms.txt` + fetch guidance) and an
  updated layout skill (anonymous clone of the public
  component-library repo). Requires a `web_fetch`-style tool in the
  loop for doc pages — small, read-only, concurrency-safe.
- `assistant_node` chat mode → docs skill + fetch replaces
  `altinn_planning`; delete the docs-readiness polling and the
  connect-hard-fail path.

**Phase 3 — delete the agent's MCP client stack**
`agents/services/mcp/` (738 LOC incl. 348 already-dead
`mcp_verification.py`), `mcp_tool.py` + `mcp_factory.py` (202),
the workflow-start 503 gate, `/health` MCP section, lifespan connection
loop, `_HIDDEN_MCP_TOOLS`, `MCP_SERVER_URL`/`MCP_SERVER_EXPECTED_VERSION`
config, and both MCP test files.

**Phase 4 — retire the server**
Remove the `altinn-mcp-server` kustomize app, Flux sync, deploy
workflow, and (after a grace period watching its Langfuse traces for
unknown consumers) the shared-ingress route for `/mcp`. Park or delete
`codegen/`. Archive `src/AI/mcp`.

**Phase 5 — publish skills for external installation**
Make the skills installable the `langfuse/skills` way: top-level README
section with `npx skills add …` / clone+symlink instructions,
client-agnostic frontmatter, and scripts included for the validator/
converter capabilities (external agents run them via their own bash;
the `run_skill_script` primitive covers our agent when it lands).

**Phase 6 — capability extension model for the Studio team**
Document (in `agents/skills/README.md`): new domain knowledge = a
skill folder; new deterministic capability = a script in the skill
folder, or an ordinary `Tool` subclass for anything needing gating/
parallelism; shared logic = the library.

Estimated effort: Phases 1–3 are the bulk; the moved code is already
clean, so this is mostly mechanical rewiring plus test updates.
Phases 4–5 are small.

## 6. Risks and mitigations

| Risk                                                                          | Mitigation                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unknown consumer of `altinn.studio/mcp/sse` surfaces after retirement         | Grace period before the ingress route is removed (Phase 4); watch the server's Langfuse traces (`x-hackathon-name` telemetry distinguishes non-agent traffic). Resurrection path is cheap if real demand appears.                                                                                                   |
| A future product need for web/desktop chat clients or zero-setup URL adoption | Consciously accepted trade-off (§0 rev 4). Resurrection path: thin fastmcp adapter over the library.                                                                                                                                                                                                                |
| Doc quality regression: curated `llms.txt` vs the crawl index                 | The 106-entry index is human-curated with descriptions — better signal than TF weighting; the model ranks better than the hand-rolled index. Keep `llms-full.txt` in git history if a richer index is ever needed. `llms.txt` becomes a maintained artifact — add "update on docs restructure" to the skill README. |
| Component-library repo access changes (anonymous clone disabled)              | The layout skill fails loudly at clone; fix is a token or re-hosting examples in the skills dir. Verified working today.                                                                                                                                                                                            |
| Agent image grows (deps: jsonschema, defusedxml)                              | Trivial next to the existing stack; the entire MCP image disappears.                                                                                                                                                                                                                                                |
| Benchmark comparability (traces change shape)                                 | Deterministic evaluators in `~/altinity-bench` read layout content from validation-span inputs; keep emitting equivalent Langfuse spans from the in-process validators (`trace_span` in the loop already wraps every tool call).                                                                                    |

## 7. What this decision does NOT decide

- The fate of the `codegen/` subproject beyond "it is orphaned and must
  not silently ride along" — owner should decide park vs delete.
- The `run_skill_script` sandboxing design — separate proposal; until
  it lands, script-bearing skills serve external agents (which have
  their own bash) while our agent uses the in-process library tools.
- The exact skills-install UX for external developers (npx skills CLI
  vs plain clone instructions) — decide when Phase 5 lands.
- The grace-period length before the `/mcp` ingress route is removed.
