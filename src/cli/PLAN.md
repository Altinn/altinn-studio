# studioctl - Altinn Studio Local DevEx CLI

## Overview

A CLI tool (`studioctl`) to improve developer experience for developing and interacting with Altinn Studio apps locally. Replaces manual clone/setup workflow with a single unified interface.

## Distribution

### Installation

```bash
curl -sSL https://github.com/.../releases/latest/download/install.sh | sh
```

Install script behavior:
- Install script is attached as release asset
- Downloads from GitHub Releases
- Verifies environment before proceeding:
  - Supported OS (Linux, macOS, Windows 10 1803+)
  - .NET 8 SDK installed
  - Docker or Podman available (connection test via `docker info`/`podman info`)
- Runtime priority: Docker preferred, Podman as fallback
- Does NOT modify PATH - prints instructions for user to add manually

### Bundle Contents

Single release archive per platform:
- `studioctl` main binary (Go, includes container/env management)
- `app-manager` binary (.NET, framework-dependent)

### Platforms

- Linux (amd64, arm64)
- macOS (amd64, arm64)
- Windows (amd64) - requires Windows 10 1803+ for AF_UNIX support

### Updates

- `studioctl self update` fetches latest release, prompts for confirmation
- **Safety**: Download to temp, verify checksum, atomic rename on success (keeps current if any step fails)
- Windows: rename trick (rename running binary, write new, delete old on next run)
- Version checks on `studioctl doctor` and `studioctl self update` only
- `studioctl self update` also restarts app-manager if running after upgrade

### Versioning

- Semver 2.0 for git tags/releases (e.g., `v1.2.3`, `v1.2.3-preview.1`)
- Preview releases (`-preview.N`) before stabilizing new versions
- `self update` only offers stable releases by default; `--preview` flag to include previews

## Architecture

### Client/Server Model (gRPC over UDS)

Unix Domain Sockets for all platforms (Windows 10+ supports AF_UNIX).

**Socket locations:** `$STUDIOCTL_SOCKET_DIR/*.sock`

**Proto definitions:**
- Location: `src/cli/protos/`
- Structure: `app_manager.proto` for .NET server communication
- Generated code committed to repo (CI verifies sync)
- Generates for both Go and .NET
- **Workflow**: Run protoc locally, commit generated files, CI verifies they're in sync

**Components:**

1. **studioctl** (Go, main binary)
   - CLI interface and command handling
   - Infrastructure management via Resource Model (see Phase 2)
   - Uses shared library at `src/Runtime/devenv/pkg/resource/`
   - Abstracts container runtime (Docker, Podman) and other resource types
   - Spawns and manages app-manager server

2. **app-manager** (.NET, framework-dependent server)
   - Roslyn-powered analysis of Altinn apps
   - **gRPC only**: No CLI mode - pure server, testing via grpcurl or Go client
   - Single daemon handles multiple apps (not per-app)
   - Handles concurrent requests in parallel
   - Fresh analysis each request (no caching)
   - Initial scope: metadata only (SDK version, NuGet refs, target framework)
   - Migrated from existing `altinn-studio-cli` (upgrade backend/frontend)
   - Requires .NET 8 SDK installed (multi-targeting planned)
   - Cold start: 2-3s acceptable for Roslyn spinup
   - **SDK handling**: Use whatever `dotnet` is in PATH, fail if wrong version

### Server Lifecycle (app-manager only)

- **Lazy spawn**: Server starts on-demand when commands need Roslyn analysis
- **Keep-alive**: Server stays running until explicit `studioctl servers down` or idle timeout
- **Idle timeout**: 8 hours default (configurable) - covers typical workday without cold starts
- **PID files**: Stored in `$STUDIOCTL_HOME/` for tracking
- **Socket path**: `$STUDIOCTL_SOCKET_DIR/app-manager.sock`
- **ServerManager interface**: All spawn/stop/health behind interface for testing
- **Stale PID handling**: Verify PID alive before connecting, auto-cleanup orphaned state
- **Version management**: studioctl manages server version
- **Upgrade strategy**: Drain pending operations (5s max), then restart server
- **Health checks**: Custom health check RPC endpoint

### Data Storage

**Location:** `$HOME/.altinn-studio/` (overridable via `STUDIOCTL_HOME`)

**Contents:**
- `app-manager.sock` - Unix domain socket for gRPC
- `app-manager.pid` - PID file for server
- `logs/` - Log files for app-manager (size-based rotation, keep last 10MB)
- `data/` - Container volumes for app data
- `config.yaml` - Persisted configuration (image overrides, env settings)
- `credentials.yaml` - Gitea authentication credentials (file permissions 0600)

### Configuration

**Environment variables for path overrides:**
- `STUDIOCTL_HOME` - override `~/.altinn-studio/` (default: `$HOME/.altinn-studio`)
- `STUDIOCTL_SOCKET_DIR` - override socket location (default: `$STUDIOCTL_HOME`)

**Config resolution order:**
1. CLI flags (`--home`, `--socket-dir`)
2. Environment variables
3. Defaults

All internal code uses config struct, never reads paths directly.

**Config struct (Go):**
```go
type Config struct {
    Home      string // $STUDIOCTL_HOME or ~/.altinn-studio
    SocketDir string // $STUDIOCTL_SOCKET_DIR or Home
    LogDir    string // Home/logs
    DataDir   string // Home/data (container volumes)
    Version   string // Embedded at build time
}
```

### Internal Architecture

**Go (studioctl) interfaces:**

1. **ReleaseClient** - GitHub releases (self-update)
   - `GetLatestRelease() (Release, error)`
   - `DownloadAsset(name string) (io.ReadCloser, error)`

2. **ContainerClient** - already exists in fixture/devenv lib

3. **ServerManager** - app-manager lifecycle
   - `EnsureRunning() error`
   - `Stop() error`
   - `Health() error`

4. **StudioClient** - Altinn Studio API operations (authenticated)
   - `GetUser(ctx) (User, error)` - validate token, get current user
   - `GetRepo(ctx, org, repo string) (Repo, error)` - get repo metadata
   - `CloneRepo(ctx, org, repo, destPath string) error` - clone via HTTPS with token auth

**.NET (app-manager) interfaces:**

1. **INuGetClient** - package versions
   - `GetLatestVersionAsync(packageId) -> Version`

2. **IDesignerClient** - frontend versions
   - `GetFrontendVersionAsync() -> string`

Both injected via DI container, mockable in tests.

### Config Sharing (Go ↔ .NET)

**Spawn-time config (CLI args to app-manager):**
```
app-manager --socket /path/to/app-manager.sock \
            --log-dir /path/to/logs
```

**Per-request config (gRPC message fields):**
```protobuf
message UpgradeBackendRequest {
  string app_path = 1;
  bool include_prerelease = 2;
}

message GetAppMetadataRequest {
  string app_path = 1;
}
```

.NET server is stateless - no knowledge of STUDIOCTL_HOME.
All paths come from Go via spawn args or RPC requests.

## App Detection

- **Primary signal**: `App/config/applicationmetadata.json` presence
- **Fallback signals**: csproj with Altinn.App.* references, directory structure
- **Auto-detect from cwd**: Walk up from cwd to find app root, no explicit registration required
- **Walk depth limit**: Max 20 directories up from cwd (supports deep nesting)
- **Detection feedback**: Only print "Using app at X" when detected path differs from cwd
- **No monorepo support**: Single app per directory expected
- **Path override**: `-p|--path` flag to specify app directory from anywhere (overrides auto-detect)

## Commands

### Core Commands

```
studioctl run [-p PATH] [-- dotnet args]       # Run app natively (wraps 'dotnet run')
studioctl env up [-r localtest] [--detach] [--monitoring]  # Start environment
studioctl env down                              # Stop environment
studioctl env logs [--component=NAME]           # Stream environment logs
studioctl env status                            # Show environment status
studioctl servers down                          # Stop app-manager server
```

The `-r|--runtime` flag specifies which runtime to use. Currently only `localtest` is supported (and is the default).

### Authentication Commands

```
studioctl auth login [--env ENV] [--host HOST]  # Authenticate with Altinn Studio (prompts for PAT)
studioctl auth status [--env ENV]               # Show authentication status
studioctl auth logout [--env ENV | --all]       # Clear stored credentials
```

### App Management Commands

```
studioctl app clone [--env ENV] <org>/<repo> [dest]  # Clone app repo (requires auth)
studioctl app update                                  # Upgrade Altinn.App NuGet packages + app frontend
```

### Installation Commands

```
studioctl install [--force]  # Bootstrap localtest resources (testdata, infra configs)
```

### Maintenance Commands

```
studioctl doctor [--json]  # Diagnostic command (diagnose only, no auto-fix)
studioctl self update      # Check for studioctl updates, download and install
```

## Command Behaviors

### `studioctl run`

- Wraps `dotnet run` with minimal environment injection (only localtest connection vars)
- Full argument passthrough: everything after `--` goes to dotnet
- If localtest not running:
  - TTY mode: prompts "Localtest not running. Start it? [Y/n]"
  - Non-TTY mode (scripts/CI): fail with error "Localtest not running. Run `studioctl env up` first."
- Build errors: raw passthrough of dotnet output
- Ctrl+C: direct signal forwarding to dotnet process
- Works from any directory with `-p/--path` flag

### `studioctl env up`

- Foreground by default, `--detach` for background
- Default port: 8000 (configurable via `-p/--port`)
- If containers from previous session exist: reuse them (attach to existing)
- Version check: warn if existing containers are from older localtest version, suggest `env down && env up`
- Orphan handling: detect stale containers (from crashed studioctl), warn and prompt "Clean up? [Y/n]"
- Container management via Go libraries (not docker-compose)
- Network handling: detect and reuse existing altinn networks if compatible
- Port conflicts: best-effort (let container runtime report conflicts)
- Silently checks for localtest updates, warns if outdated (doesn't block)
- Failure mode: fatal on any container failure - abort everything for clean retry
- `--monitoring` flag: start full monitoring stack (otel-collector, grafana, mimir, loki, tempo)
- `--open` flag: open localtest in browser after starting

### `studioctl env down`

- Stops environment containers
- If app still running (via `studioctl run`): warn only, proceed with teardown

### `studioctl env logs`

- Stream logs to stdout
- Filter by component: `--component=localtest`, `--component=pdf`, etc.
- No "attach" concept - logs only

### `studioctl env status`

- Shows running/stopped state
- Displays ports and runtime version
- Shows health check status, last errors, uptime

### `studioctl auth login`

- Prompts for Personal Access Token (PAT) via stdin
- Token input hidden (no echo) for security
- Validates token against Altinn Studio API before storing
- Username retrieved from API response (not user input)
- On success: stores credentials in `$STUDIOCTL_HOME/credentials.yaml` with 0600 permissions
- Displays authenticated username on success
- If already logged in to same env: warns and prompts for confirmation to overwrite
- `--env` flag: specify environment name (default: `prod`)
- `--host` flag: specify Altinn Studio host (default: `altinn.studio` for prod)
- `--token` flag: accept token as argument (for scripts, discouraged for security)
- `--open` flag: open browser to PAT creation page before prompting for token

**Credentials file format (`credentials.yaml`):**
```yaml
envs:
  prod:                          # Production (default)
    host: "altinn.studio"
    token: "<PAT>"
    username: "user"
  dev:
    host: "dev.altinn.studio"
    token: "<PAT>"
    username: "user"
```

**How to create a PAT:**
1. Log in to Altinn Studio (altinn.studio)
2. Navigate to Gitea settings → Applications → Manage Access Tokens
3. Create token with the following scopes:
   - `read:user` (validate token and retrieve username)
   - `read:repository` and `write:repository` (clone and push apps)
4. Copy token and use with `studioctl auth login`

Tip: Use `studioctl auth login --open` to open the browser directly to the token creation page.

### `studioctl auth status`

- Shows current authentication status for all environments (or specific env with `--env`)
- Displays: env name, logged in/out, username, host
- Validates tokens are still valid (API calls)
- `--env` flag: show status for specific environment only
- `--json` flag for machine-parseable output

### `studioctl auth logout`

- Clears stored credentials for specified environment
- `--env` flag: specify environment (default: `prod`)
- `--all` flag: clear all stored credentials
- Silent if not logged in

### `studioctl app clone`

- Clones an Altinn app repository
- Syntax: `studioctl app clone <org>/<repo> [destination]`
- Requires authentication (`studioctl auth login` first)
- `--env` flag: specify environment (default: `prod`)
- Uses host, username, token from stored credentials for the specified env
- Uses HTTPS clone with PAT for authentication (not SSH)
- Default destination: `./<repo>` (repo name in current directory)
- If destination exists: fail with error (no implicit overwrite)
- Clone URL: `https://<username>:<token>@<host>/repos/<org>/<repo>.git`
- Validates org/repo exists before cloning (API call)
- On success: prints clone path and suggests `cd <repo> && studioctl env up`

### `studioctl install`

- Bootstraps `$STUDIOCTL_HOME/data/` with localtest resources:
  - `testdata/` - authorization, register, profile data for localtest
  - `infra/` - monitoring configuration files (otel, grafana, tempo, mimir, loki)
  - `AltinnPlatformLocal/` - empty directory for persistent container data
- **Source resolution** (always extracts from tarball):
  - If `STUDIOCTL_RESOURCES_TARBALL` env var is set: Extract from local tarball (used by `make dev-install`)
  - Otherwise: Download `localtest-resources.tar.gz` from GitHub release matching `Config.Version`
- Version tracking via `$STUDIOCTL_HOME/data/.version` file
- Skip if already installed (testdata has content and version matches) unless `--force`
- **Auto-invocation:** `env up` automatically runs install if resources are missing or version mismatches
- **Build:** `make resources` creates tarball from `src/Runtime/localtest/{testdata,infra}`
- CI/Release: `localtest-resources.tar.gz` attached as release asset

### `studioctl doctor`

- Diagnose only - shows problems, suggests commands, user runs manually
- `--json` flag for machine-parseable output
- Checks:
  - Prerequisites: dotnet (minimum 8.0, don't nag about updates), docker/podman
  - Environment: app-manager healthy, localtest status
  - Authentication: token validity (if credentials exist)
  - App-specific (if in app directory): SDK version, config files, build status

### `studioctl app update`

- Updates Altinn.App.* NuGet packages (minor/patch only by default)
- Major version handling: block without `--allow-major` flag to prevent accidental breaking changes
- Updates app frontend in index.cshtml
- NuGet version detection: NuGet API directly
- Frontend version detection: Designer API at `src/Designer` (skip if Designer offline)
- Auto-runs `dotnet restore` after package update

## Localtest Runtime

### Infrastructure Management

- **Not using docker-compose** - Go tooling constructs infra programmatically
- **Resource Model**: Generalized IaC-style DAG of resources with dependency resolution
  - Primitives: Container, Network, CLICommand (like terraform null_resource), K8sManifest
  - Execution: Topological sort with parallel execution where dependencies allow
  - Details: See dedicated Phase 2 (Resource Model)
- **Resource definitions**: Hardcoded in Go code (not user-editable YAML)
- Uses shared devenv library at `src/Runtime/devenv/pkg/resource/`
- Volume location: `$STUDIOCTL_HOME/data/`
- Config (ports, test users, etc.): hardcoded defaults
- **Container user**: All containers run as current user (uid:gid) to prevent root-owned bind mount files
- **Idempotent operations**: Destroy operations succeed even if resources already gone

### Container Labeling

- All containers/networks labeled with `altinn.studio/cli-<name>`
- Label value matches `--runtime` flag (e.g., "localtest")
- **Strict ownership**: only manage resources with studioctl labels, never touch unlabeled resources

### Updates

- Pull latest image from GHCR on `env up`
- On network failure: use cached image
- Version pinning via studioctl config (optional)

### Multi-App Support

- Localtest has built-in proxy/discovery mechanism for routing
- Multiple apps can run against one localtest instance
- **studioctl behavior**: Fire-and-forget - `studioctl run` wraps dotnet, doesn't track running apps
- User manages multiple apps via multiple terminals

## UI/Output

- **Library**: charmbracelet/lipgloss (Go)
- **Progress style**: Spinner with single-line status updates (like npm, cargo)
- **Colors**: Respect `NO_COLOR` environment variable
- **Error messages**: Describe fix in human-readable form, no copy-paste commands (platform complexity)
- **Shell completion**: Not in initial release

### Logging

User-friendly output design:
- **Default**: Minimal output - show progress/status, final result, errors
- **Verbose** (`-v`): Show what's happening step-by-step (e.g., "Pulling image...", "Creating network...")
- **Debug** (`-vv` or `STUDIOCTL_DEBUG=1`): Full diagnostic output including timestamps, internal state
- **Structured logs**: app-manager writes JSON logs to `$STUDIOCTL_HOME/logs/` for debugging
- **No log levels in user output**: Use natural language, not "[INFO]" prefixes

## Error Handling

1. **SDK mismatch**: Fail fast - check SDK version upfront before spawning app-manager
2. **Raw errors**: Show underlying error from dotnet/docker
3. **Actionable errors**: Detect common issues, suggest specific fix commands
4. **Diagnostic mode**: `studioctl doctor` for comprehensive troubleshooting

## Dependencies

**Required on user system:**
- .NET 8 SDK (minimum)
- Docker or Podman

## Testing

**Unit tests:**
- All external clients behind interfaces
- Config struct injectable, no globals
- Use t.TempDir() for path isolation

**E2E tests:**
- Real everything (containers, network)
- `STUDIOCTL_HOME=$(mktemp -d)` for isolation
- Cleanup on test completion

## Development

**Make targets:**
- `make build` - build studioctl binary
- `make test` - unit tests
- `make lint` - run linter
- `make resources` - build localtest resources tarball
- `make dev-install` - build and install to isolated ./build/dev-home/
- `make user-install` - build and install to user directories (~/.local/bin, ~/.altinn-studio)
- `make dev-run CMD="env up"` - run command with dev config
- `make clean` - remove build artifacts

**Environment isolation:**
- Dev/test runs NEVER touch ~/.altinn-studio/
- All tests use STUDIOCTL_HOME override
- CI uses fresh temp dirs per test job

## Code Quality & Static Analysis

### Go (studioctl)

Use same setup as `src/Runtime/operator/`:
- **golangci-lint v2.5.0** installed via `go-install-tool` pattern
- Copy `.golangci.yml` from `src/Runtime/operator/.golangci.yml`
- Make targets: `lint`, `lint-fix`, `lint-config`

### C# (app-manager)

Use same setup as `src/Runtime/StudioGateway/`:
- Copy `Directory.Build.props` from `src/Runtime/StudioGateway/Directory.Build.props`:
  - `TreatWarningsAsErrors` in CI
  - `EnableNETAnalyzers=true`, `AnalysisMode=All`, `Features=strict`
  - `NuGetAudit=true`, `NuGetAuditMode=all`
  - Analyzers: CSharpier.MsBuild, Nullable.Extended.Analyzer, SonarAnalyzer.CSharp
- Copy `.csharpierrc.yaml` from `src/Runtime/StudioGateway/.csharpierrc.yaml`:
  - `printWidth: 120`, `useTabs: false`, `tabWidth: 4`, `endOfLine: auto`
- Copy `.config/dotnet-tools.json` from `src/Runtime/StudioGateway/.config/dotnet-tools.json`:
  - CSharpier v1.2.1 as local tool (install via `dotnet tool restore`)

## Non-Goals (Initial Release)

- App scaffolding (`studioctl init`) - use Altinn Studio web UI
- Plugin/extension system
- Secrets/environment management
- Shell completion
- Telemetry
- Additional runtimes beyond localtest
- Monorepo support
- Localtest config customization

## Future Considerations

- Additional runtimes (kind-based, etc.) via `-r` flag
- Telemetry (opt-in)
- Shell completion (bash/zsh/fish/powershell)
- App configuration validation in Roslyn server
- Multi-targeting for .NET versions

## Design Decisions

Summary of key decisions made during planning:

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Server lifecycle | Keep-alive until explicit `servers down` or 8h idle | Avoid cold start latency during workday |
| Resource abstraction | Generalized Resource Model (DAG) | IaC-style, supports containers/networks/CLI/k8s |
| Container config | Hardcoded in Go | No user config drift, version-locked |
| Localtest distribution | Pre-built GHCR images | Faster startup, no build step, simpler deployment |
| CLI framework | stdlib flag package + manual subcommand routing | Minimal deps, small binary; accepts both -flag and --flag |
| app-manager CLI | gRPC only, no CLI mode | Simpler, test via grpcurl |
| App detection | Auto-detect + override, max 20 levels | Deep nesting support, no nested apps |
| Detection feedback | Only when path differs from cwd | Clean output |
| Non-TTY behavior | Fail with message | Safe for scripts/CI |
| Container failure | Fatal on any failure | Clean retry state |
| Orphan containers | Warn and prompt | Balance of safety and convenience |
| Version mismatch (containers) | Warn, suggest `env down && env up` | User decides |
| Major version updates | Block without `--allow-major` | Prevent accidental breakage |
| Multi-app tracking | Fire-and-forget | Simple, user manages terminals |
| Monitoring stack | Support via `--monitoring` flag | Match docker-compose definition |
| Progress UI | Spinner + status line | npm/cargo style |
| Error messages | Human-readable descriptions | Platform complexity makes copy-paste impractical |
| PATH modification | Print instructions only | Respect user's system |
| Self-update safety | Atomic replace with checksum | Keep current if any step fails |
| env down with app running | Warn and proceed | User's responsibility |
| Library migration | Big bang PR | Clean, single atomic change |
| Proto workflow | Commit generated code | CI verifies sync |
| SDK selection | Use PATH dotnet | Simple, user fixes PATH if wrong |
| Signal handling | Let child inherit console | Simple cross-platform, OS handles signals |
| Container reuse | Match name + image digest + labels | Detect version changes, respect ownership |
| Foreground mode | Aggregated logs (docker compose style) | Familiar UX |
| Exit codes | 0/1 only | Simple, no special codes |
| ServerManager spawn | Synchronous with health check | Reliable connection |
| app-manager location | `$STUDIOCTL_HOME/bin/app-manager` | Extracted from bundle on install |
| Verbose flags | Both global and per-command | Flexible usage |
| Resource types | Use generic devenv resources | Reusable, add missing types to devenv |
| Config validation | Eager at startup, auto-create dirs | Fail fast, user-friendly |
| Log aggregation | Color-coded container name prefixes | Familiar docker-compose UX |
| Localtest detection | Container labels + HTTP health check | Robust detection |
| Env injection | Only set if unset | Don't override user config |
| Phase completion | Tests required for all logic | Quality gate per phase |
| Auth mechanism | Personal Access Token (PAT) | Simple, already supported, no OAuth complexity |
| Credentials storage | YAML file with 0600 permissions | Human-readable, secure file permissions |
| Credentials structure | `envs` map (like config.yaml) | Consistent pattern, multi-env support |
| Default environment | `prod` (altinn.studio) | Most common use case |
| Clone method | git exec with token in URL | Simpler than go-git, works with credential helpers |
| Token validation | API call before storing | Fail fast on invalid tokens |
| Resource bundling | Separate tarball + install command | Keeps binary lean, resources fetched once |
| Install sourcing | Dev: local tarball, Release: GitHub tarball | Seamless dev experience, versioned releases |
| Install auto-invocation | `env up` triggers if missing/outdated | Convenient, no explicit step required |
| Container user | Run as current uid:gid | Prevents root-owned bind mount files |
| Idempotent destroy | Ignore "not found" errors on destroy | `env down` succeeds even if resources already gone |

## Implementation Phases

### Phase 1: Migrate fixture library to `src/Runtime/devenv/` ✅ COMPLETE

Single PR containing all changes:
1. Create `src/Runtime/devenv/` with new go.mod (`altinn.studio/devenv`)
2. Move packages from `test/fixture/pkg/` to `devenv/pkg/`
3. Update internal import paths
4. Update all consumers (pdf3, operator, StudioGateway) go.mod and imports
5. Remove `test/fixture/` after migration
6. Verify all tests pass

Also check if GH action workflows need to be updated. Dockerfiles need to be updated in some cases.

### Phase 2: Resource Model ✅ COMPLETE

Generalized IaC-style resource abstraction. Separate detailed design session before implementation.

**Core primitives:**
- `Container` - Docker/Podman container lifecycle
- `Network` - Container network management
- `CLICommand` - Shell command execution (like terraform null_resource)
- `K8sManifest` - Kubernetes resources via client-go or YAML files

**Execution model:**
- Resources form a DAG with explicit dependencies
- Topological sort determines execution order
- Independent resources execute in parallel
- Idempotent operations (create-if-not-exists, update-if-changed)

**Package location:** `src/Runtime/devenv/pkg/resource/`

**Interfaces (high-level, details TBD):**
```go
type Resource interface {
    ID() string
    Dependencies() []string
    Apply(ctx context.Context) error
    Destroy(ctx context.Context) error
    Status(ctx context.Context) (Status, error)
}

type Graph struct { /* DAG of resources */ }
func (g *Graph) Apply(ctx context.Context) error
func (g *Graph) Destroy(ctx context.Context) error
```

### Phase 3: Implement Container/Network Resources ✅ COMPLETE
1. Implement `Container` resource type using Phase 2 interfaces
2. Implement `Network` resource type
3. Add volume management for `$STUDIOCTL_HOME/data/`
4. Add labeling support (`altinn.studio/cli-<name>`)

### Phase 4: Containerize localtest ✅ COMPLETE

**Goal:** Publish localtest as pre-built image and eliminate nginx loadbalancer container.

**GitHub Workflow (`.github/workflows/deploy-runtime-localtest.yaml`):**
- Trigger: push to `main` when `src/Runtime/localtest/**` changes
- Build multi-arch image (linux/amd64, linux/arm64)
- Push to `ghcr.io/altinn/altinn-studio/runtime-localtest:<SHA>`
- Trivy security scanning (consistent with pdf3 workflow)
- No ACR/Flux deployment (local development only)

**Extend ProxyMiddleware to replace nginx loadbalancer:**

Routes to implement (currently in nginx.conf):

| Path | Target | Notes |
|------|--------|-------|
| `/` (exact) | localtest | Redirect to /Home/ |
| `/Home/*` | localtest | Script path rewriting for browser-refresh |
| `/receipt/*` | host:5060 | Receipt component on developer machine |
| `/accessmanagement/*` | host:5117 | Access management on developer machine |
| `/pdfservice/*` | pdf3:5300 | PDF service container |
| `/grafana/*` | grafana:3000 | Optional monitoring (WebSocket support for /api/live/) |
| Default `/{org}/{app}/*` | registered app or host:5005 | Existing behavior |

Features to port from nginx:
1. **Frontend version substitution** - Cookie `frontendVersion` triggers content rewriting of altinn-app-frontend resources
2. **Script path rewriting** - Rewrite `/_framework/aspnetcore-browser-refresh.js` to `/Home/_framework/...`
3. **Cookie domain rewriting** - Map `altinn3local.no` → `local.altinn.cloud`
4. **WebSocket upgrade** - For Grafana Live connections
5. **Error responses** - Return helpful 502 messages when upstream unavailable
6. **Long timeouts** - 1 hour for debugging scenarios
7. **Header forwarding** - X-Real-IP, X-Forwarded-For, X-Forwarded-Host

**Configuration:**
- Host services (receipt, accessmanagement) via environment variables for host address
- PDF service endpoint configurable
- Grafana endpoint only active when monitoring enabled

**Delete:**
- `src/Runtime/localtest/loadbalancer/` directory (Dockerfile, nginx.conf, error pages)

### Phase 5: Build studioctl main binary ✅ COMPLETE

**Directory:** `src/cli/studioctl/`

**Setup:**
1. Create Go module (`altinn.studio/studioctl`)
2. Manual subcommand routing with stdlib `flag` package
3. Copy linting setup from `src/Runtime/operator/` (golangci-lint, .golangci.yml)

**Config package (`internal/config/`):**
```go
type Config struct {
    Home      string // $STUDIOCTL_HOME or ~/.altinn-studio
    SocketDir string // $STUDIOCTL_SOCKET_DIR or Home
    LogDir    string // Home/logs
    DataDir   string // Home/data
    BinDir    string // Home/bin (app-manager location)
    Version   string // Embedded at build time
}

func (c *Config) CredentialsPath() string // Home/credentials.yaml
```
- Resolution order: CLI flags → env vars → defaults
- Eager validation at startup
- Auto-create directories if missing

**Interfaces (`internal/interfaces/`):**
```go
type ReleaseClient interface {
    GetLatestRelease(ctx context.Context, includePrerelease bool) (Release, error)
    DownloadAsset(ctx context.Context, name string) (io.ReadCloser, error)
}

type ServerManager interface {
    EnsureRunning(ctx context.Context) error  // Sync spawn with health check
    Stop(ctx context.Context) error
    Health(ctx context.Context) error
}

type LocaltestDetector interface {
    IsRunning(ctx context.Context) (bool, error)  // Labels + HTTP health
}
```

**Commands (`internal/cmd/`):**
- `run` - Wrap dotnet run, inherit console for signal handling
- `env up|down|logs|status` - Container lifecycle via devenv resources
- `auth login|status|logout` - Authentication management
- `app clone|update` - App repository operations
- `doctor` - Diagnostic checks
- `self update` - Self-update mechanism
- `servers down` - Stop app-manager

**App detection (`internal/appdetect/`):**
- Primary: `App/config/applicationmetadata.json`
- Fallback: csproj with Altinn.App.* references
- Max 20 levels up from cwd
- Print "Using app at X" only when path differs from cwd

**Authentication (`internal/auth/`):**

Credentials storage (mirrors PersistedConfig pattern):
```go
type Credentials struct {
    Envs map[string]EnvCredentials `yaml:"envs,omitempty"`
}

type EnvCredentials struct {
    Host     string `yaml:"host"`     // e.g., "altinn.studio"
    Token    string `yaml:"token"`    // Personal Access Token
    Username string `yaml:"username"` // Retrieved from API validation
}

const (
    DefaultEnv  = "prod"
    DefaultHost = "altinn.studio"
)
```

Known environments (with default hosts):
- `prod` → `altinn.studio`
- `dev` → `dev.altinn.studio`
- `staging` → `staging.altinn.studio`

Key functions:
- `LoadCredentials(homeDir string) (*Credentials, error)` - load from credentials.yaml
- `SaveCredentials(homeDir string, creds *Credentials) error` - save with 0600 permissions
- `(c *Credentials) Get(env string) (*EnvCredentials, bool)` - get credentials for env
- `(c *Credentials) Set(env string, creds EnvCredentials)` - set credentials for env
- `(c *Credentials) Delete(env string)` - delete credentials for env
- `(c *Credentials) DeleteAll()` - clear all credentials

**Studio client (`internal/studio/`):**

```go
type Client struct {
    host       string
    token      string
    username   string
    httpClient *http.Client
}

func NewClient(creds *auth.EnvCredentials) *Client
func (c *Client) GetUser(ctx context.Context) (*User, error)
func (c *Client) GetRepo(ctx context.Context, org, repo string) (*Repository, error)
func (c *Client) CloneRepo(ctx context.Context, org, repo, destPath string) error
```

API endpoints used (Gitea API):
- `GET /repos/api/v1/user` - validate token, get current user
- `GET /repos/api/v1/repos/{owner}/{repo}` - check repo exists before clone

Clone implementation:
- Uses `git clone` via exec (not go-git library) for simplicity and credential helper compatibility
- Clone URL format: `https://{username}:{token}@{host}/repos/{org}/{repo}.git`
- Credentials embedded in URL (standard git HTTPS auth pattern)
- Validates repo exists via API before attempting clone

**Terminal UI (`internal/ui/`):**
- lipgloss for styling
- Spinner + single-line status (npm/cargo style)
- Color-coded log prefixes for foreground mode
- Respect `NO_COLOR`

**Verbose/Debug flags:**
- `-v` / `--verbose`: Step-by-step output
- `-vv` / `--debug` or `STUDIOCTL_DEBUG=1`: Full diagnostics
- Accepted both globally and per-command

**Build:**
- Version embedding: `-ldflags "-X main.version=$(VERSION)"`
- Makefile targets: `build`, `test`, `lint`

**Tests (completion criteria):**
- Unit tests for config resolution (env vars, flags, defaults)
- Unit tests for app detection (walk up, max depth, fallback signals)
- Unit tests for command parsing and flag handling
- Unit tests for verbose/debug flag resolution
- Unit tests for persisted config load/save and image ref parsing
- Unit tests for credentials load/save/delete with file permissions
- Unit tests for Studio client (mock HTTP responses)
- Unit tests for auth commands (login validation, status display, logout, multi-env)
- Unit tests for app clone (repo validation, clone execution, env selection)
- Mock-based tests for interfaces (ReleaseClient, ServerManager, StudioClient)
- Table-driven tests where applicable

**Localtest runtime (`internal/localtest/`):**

Container definitions (hardcoded in Go using devenv resources):
- `localtest` - Main platform container (port mapping: LoadBalancerPort→5101, 5101→5101)
- `localtest-pdf3` - PDF service container (port mapping: 5300→5031)
- Monitoring stack (optional via `--monitoring`): grafana, mimir, loki, tempo, otel-collector (public images)

**Image mode detection:**
- Auto-detects dev vs release mode based on cwd
- Dev mode: Enabled when running from altinn-studio repo (checks for `src/Runtime/localtest/Dockerfile`)
- Release mode: Uses pre-built images from GHCR
- Dev mode builds images locally using `resource.LocalImage`
- Release mode pulls images using `resource.RemoteImage`

**Persisted configuration (`internal/localtest/persistedconfig.go`):**

```go
type PersistedConfig struct {
    Envs map[string]EnvConfig `yaml:"envs,omitempty"`
}

type EnvConfig struct {
    Images map[string]string `yaml:"images,omitempty"`
}
```

Config file (`$STUDIOCTL_HOME/config.yaml`):
```yaml
envs:
  localtest:
    images:
      localtest: "ghcr.io/altinn/altinn-studio/runtime-localtest:v1.0.0"
      pdf: "ghcr.io/altinn/altinn-studio/runtime-pdf3-worker:latest"
```

Key functions:
- `LoadPersistedConfig(homeDir) (PersistedConfig, error)` - load config, returns empty if missing
- `SavePersistedConfig(homeDir, cfg) error` - save with 0600 permissions
- `GetLocaltestImages() ImageConfig` - get image config with defaults for missing values
- `parseImageRef(ref) ImageSpec` - parse "image:tag" format

Implementation:
1. Define resource graph for localtest stack
2. Network setup with `altinn.studio/cli-localtest` labels
3. Port mapping, volume mounts to `$STUDIOCTL_HOME/data/`
4. Image mode detection and resource building
5. Container reuse logic (name + image digest + labels)
6. Log aggregation with color-coded prefixes

**Output:** Working `studioctl` binary with full localtest runtime support (env up).

### Phase 6: Implement gRPC app-manager server (.NET)

**Proto definitions (`src/cli/protos/`):**
```protobuf
service AppManager {
    rpc Health(HealthRequest) returns (HealthResponse);
    rpc GetAppMetadata(GetAppMetadataRequest) returns (GetAppMetadataResponse);
    rpc UpgradeBackend(UpgradeBackendRequest) returns (UpgradeBackendResponse);
    rpc UpgradeFrontend(UpgradeFrontendRequest) returns (UpgradeFrontendResponse);
}
```

**Implementation:**
1. Generate Go client + .NET server code (commit generated, CI verifies sync)
2. Migrate existing `src/cli/src/altinn-studio-cli/` Roslyn code
3. Interfaces: `INuGetClient`, `IDesignerClient` (DI injectable)
4. CLI args: `--socket`, `--log-dir`
5. Server lifecycle: PID file, health check, 8h idle timeout

**Tests (completion criteria):**
- Unit tests for all gRPC methods with mocked dependencies
- Unit tests for INuGetClient, IDesignerClient implementations
- Integration tests for Roslyn analysis against test apps
- Proto sync verification in CI

### Phase 7: Integration & polish

**Self-update:**
1. ReleaseClient implementation (GitHub Releases API)
2. Atomic replace: download to temp → verify checksum → rename
3. Windows rename trick for running binary
4. Restart app-manager after upgrade

**Distribution:**
1. Install script (verify prerequisites, download, print PATH instructions)
2. Bundle creation per platform (studioctl + app-manager)
3. Release automation

**Development:**
- Makefile targets: `build`, `test`, `test-e2e`, `lint`, `dev-install`, `dev-run`
- All dev/test runs isolated from `~/.altinn-studio/`

**Tests (completion criteria):**
- Unit tests for self-update logic (download, checksum, atomic replace)
- E2E tests: full workflow from `env up` through `run` to `env down`
- Cross-platform CI (Linux, macOS, Windows)
- Install script validation


### COMPLETION

When complete, output:

<promise>COMPLETE</promise>

## References

- Test apps: `src/test/apps/` (existing sample Altinn apps for integration testing)
- Current localtest: `src/Runtime/localtest`
- Shared devenv library: `src/Runtime/devenv/` (module: `altinn.studio/devenv`)
- Existing CLI to migrate: `src/cli/src/altinn-studio-cli/`
- Local dev guide: altinn-studio-docs `v8/guides/development/local-dev/_index.en.md`
