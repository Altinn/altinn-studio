# Deployment guide — private-config tenants

This guide describes the recommended deployment pattern for a kommune
(or any tenant) running the augmenter-agent image against their own
private configuration repository.

The augmenter-agent image is **public**: it's the same binary for every
tenant, distributed via Docker Hub / GHCR. The configuration that
distinguishes one tenant from another (templates, rules, registries,
secrets) lives in the tenant's **private** repository. Nothing
domain-specific ships in the image.

## The split

| Concern | Where it lives | Repository visibility |
|---|---|---|
| Image binary | Container registry | Public |
| `config/` folder | Tenant repo | Private |
| `.env` (`SANDKASSE_API_KEY`, etc.) | Tenant repo, but `.gitignored` | Never committed |
| `docker-compose.yaml` | Tenant repo | Private |

The tenant's private repository owns the deployment. The augmenter-agent
repository owns the image and the contract (`config/README.md`).

## Tenant repository layout

```
my-kommune-augmenter/                   # private repo
├── README.md                           # tenant-specific runbook
├── docker-compose.yaml                 # pins image tag, mounts config
├── .env                                # gitignored (secrets)
├── .env.example                        # committed, no secrets
├── .gitignore                          # at minimum: .env, *.pem, secrets/
└── config/                             # contract: see config/README.md
    ├── pipeline.yaml
    ├── templates/
    ├── mappings/
    ├── registries/
    ├── rules/
    ├── orchestrator/
    └── tools/
```

The image refuses to boot if `config/` is incomplete — the
`ConfigValidator` error message at startup lists every missing piece.
That message is the contract; whatever it accepts is a valid tenant
configuration.

## Tenant `docker-compose.yaml`

```yaml
# my-kommune-augmenter/docker-compose.yaml
services:
  augmenter-agent:
    image: ghcr.io/altinn/augmenter-agent:v0.4.0   # pin a specific tag
    ports:
      - "8072:8072"
    env_file:
      - .env
    environment:
      - ASPNETCORE_ENVIRONMENT=production
      - Agent__BaseUrl=https://gw.sandkasse.ai/v1
      - Agent__Model=telenor:gemma4
      - Agent__ApiKey=${SANDKASSE_API_KEY}
      - Agent__MaxTokens=8192
    volumes:
      - ./config:/etc/augmenter:ro
    restart: unless-stopped
```

Notes:

- **Pin the image tag.** Never use `:latest` in production — the image
  contract can move forward (new step types, new mapper primitives) and
  rolling onto an unexpected version can break a working tenant config.
- **Mount `config/` read-only.** Nothing in the image writes back to it.
- **Keep `.env` out of git.** The example file (`.env.example`) shows the
  required keys without their values.

## Upgrade flow

The two halves move independently — that's the point of the split.

| What's changing | What you do |
|---|---|
| New tenant rule, template tweak, registry entry | Edit `config/`, commit, `docker compose restart augmenter-agent` |
| New API key or model setting | Edit `.env`, `docker compose up -d --force-recreate` |
| New augmenter-agent version | Bump the `image:` tag, `docker compose pull && docker compose up -d`; if startup fails, the `ConfigValidator` message tells you what your config is missing for the new contract |

Image releases ship a `CHANGELOG.md` entry noting any contract-breaking
changes (new required folder, new mandatory field). Read that entry
before bumping tags across a major version.

## Switching configurations on the fly

If your tenant repo has multiple configurations (e.g. a `staging/`
mount and a `prod/` mount), keep both folders side by side and use a
`docker-compose.override.yaml` to point at the active one:

```yaml
# my-kommune-augmenter/docker-compose.override.yaml
services:
  augmenter-agent:
    volumes:
      - ./config-staging:/etc/augmenter:ro
```

The override file should be `.gitignored` if its mount choice is
machine-local; commit it if it's part of a named environment.

The augmenter-agent repository ships `examples/alt-config/` as a working
demonstration of a fully-different tenant configuration and a sample
override pattern.

## Secrets

`SANDKASSE_API_KEY` and any other sensitive material **must** live in
`.env` (or your secret manager of choice). They flow into the container
via env vars — they are never read from the config mount.

The image never logs the API key in cleartext. It does log the gateway
URL, model name, and request/response durations.

Recommended hardening for shared / multi-user hosts:

- Use Docker secrets (`secrets:` in compose) instead of `.env` for
  production deployments where multiple users have host access.
- Restrict `.env` to `chmod 600`.
- Rotate the gateway key on any suspected exposure; the gateway team
  can invalidate keys server-side.

## Image publication (augmenter-agent repo, not tenant repo)

For maintainers of this repository — pushing a new public image:

```bash
# Tag according to semver. Bump major on contract-breaking changes
# (new required ContentPaths root, new pipeline.yaml field).
docker build -t ghcr.io/altinn/augmenter-agent:v0.4.0 -t ghcr.io/altinn/augmenter-agent:v0.4 .
docker push ghcr.io/altinn/augmenter-agent:v0.4.0
docker push ghcr.io/altinn/augmenter-agent:v0.4
```

Always update `CHANGELOG.md` with the user-visible delta, and link to a
diff of `config/README.md` if the contract moved. Tenants read those
entries before bumping their pinned tag.
