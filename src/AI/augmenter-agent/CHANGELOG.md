# Changelog

All notable changes to the augmenter-agent image. Versioning follows
semver: bump **major** on contract-breaking changes (new required
`ContentPaths` root, removed step type, removed pipeline.yaml field that
existing tenant configs depend on), **minor** for additive features that
existing configs keep working through, **patch** for bug fixes.

Tenants pin a specific tag in their compose / Helm manifest and read
this file before bumping across minor or major versions.

## v0.4.0 — first published image

The v0.4 series productizes the per-item evaluation orchestrator, makes
the image truly tenant-agnostic, and adds first-class support for
Altinn-platform-style secret delivery.

### Added

- **`agent-pdf-orchestrated` step type.** Per-item evaluation loop with
  tool calls and markdown-based rules — replaces the monolithic
  `agent-pdf` skill prompt that timed out on long checklists.
- **8 OpenAI-compatible tools** wired through `ToolRegistry`
  (`age_at_date_from_fnr`, `days_between`, `time_within_legal_schedule`,
  `lookup_kommune`, `path_value`, `count_attachments`,
  `text_matches_any`, `text_contains_any`).
- **`SandkasseChatService`** — direct HTTP to the OpenAI-compatible
  gateway, with tool-calling. Replaces the prior Pi/CLI path.
- **`ConfigValidator`** runs at startup. The image refuses to boot when
  the mounted config is incomplete; the failure message documents every
  contract slot that must exist for the configured pipeline.
- **`examples/alt-config/`** — full second tenant configuration
  (personalpermisjon HR case) that proves multi-tenancy. The image
  binary is identical across tenants; only `/etc/augmenter` content
  differs.
- **Altinn platform secret-file support.** New
  `AddAltinnPlatformSecretFile()` extension mirrors Altinn's
  `AddAppSettingsSecretFile()` — reads
  `/altinn-appsettings-secret/altinn-appsettings-secret.json` when
  present, optional otherwise. Lets the Altinn cluster's existing Key
  Vault → K8s Secret sync feed this image without adding any Key Vault
  SDK or Service Principal credentials to the image. See `DEPLOYMENT.md`
  for the JSON shape and mount path.
- **Integration test** (`AltConfigSwapTests`) that boots the binary
  against `examples/alt-config` to prove the override path works
  end-to-end.

### Changed

- **`IDataMapperRegistry`** replaces the startup-time mapper folder
  scan. Mappers now resolve lazily by name on first request, so
  `ContentPaths` overrides from test factories or compose override files
  actually take effect (a startup scan would freeze the wrong path).

### Removed

- Deprecated `agent-pdf` skill-prompt path, IAgentService surface, and
  Claude CLI dev fallback. The image now only speaks to the
  OpenAI-compatible gateway via `SandkasseChatService`.

### Deployment notes

- First image expected at `olebhansen/augmenter-agent:v0.4.0` on Docker
  Hub for POC tenants. The DEPLOYMENT.md-documented
  `ghcr.io/altinn/augmenter-agent` registry is the future target for
  Altinn-org-owned releases.
- No `kvSetting` configuration is required on this image, despite the
  Altinn Apps secret pattern documenting it. The image is intentionally
  decoupled from Altinn-platform identity — secrets come in through the
  platform's pre-mounted JSON file or through env vars, never through
  direct Key Vault calls from inside the pod.
