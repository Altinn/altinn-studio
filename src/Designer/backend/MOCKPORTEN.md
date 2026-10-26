# Mockporten test accounts

Optional login for approved synthetic test identities, alongside Ansattporten.
Disabled by default in every environment. This does not change Mockporten itself
or enable the feature in any deployed Studio instance.

## Configuration

Supply configuration through environment variables, using a ConfigMap or Secret:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
    name: studio-mockporten
data:
    Mockporten__Enabled: 'true'
    Mockporten__ClientId: 'altinn-studio'
    Mockporten__MetadataAddress: 'https://mockporten.azurewebsites.net/api/v1/openid/.well-known/openid-configuration'
    Mockporten__Issuer: 'https://mockporten.azurewebsites.net/authorization'
    Mockporten__Users__0__PidHash: '<64-character lowercase PID hash>'
    Mockporten__Users__0__Username: 'mockporten-editor'
```

Reference each key through the Designer chart's existing
`environmentVariables.<environment>` list, for example:

```yaml
- name: Mockporten__Enabled
  valueFrom:
      configMapKeyRef:
          name: studio-mockporten
          key: Mockporten__Enabled
```

Use `secretKeyRef` instead for values held in a Secret. There is no automatic
loading of an arbitrary mounted YAML file. Environment variable changes require
a rollout of **all** Designer replicas.

Compute `PidHash` using Designer's existing `PidHash.FromPid`: lowercase hex
SHA-256 of the UTF-8 string `DeveloperMappingSettings.PidHashSalt + syntheticPid`.
Use the target environment's salt through approved secret tooling; do not print
or commit it. The example hash above is a placeholder, not a usable account.
Never configure a real person's PID. Designer independently checks the synthetic
month marker (81–92), ASCII digits, day range and control digits.

Usernames must be unique, lowercase, start with `mockporten-`, and contain only
letters, digits and hyphens (at most 40 characters). Reserve this prefix for test
accounts. Do not rename or reassign an existing entry to another identity.

## Account lifecycle

No database seeding is needed. On first successful login, Designer creates its
normal account record, marked `authentication_provider = mockporten`, and
provisions the Gitea user. A pre-existing Designer/Gitea username or an identity
already mapped to another provider is rejected, never linked automatically.
The additive database migration must be applied before using the feature.
Existing human and bot accounts remain unchanged.

After the first login, an administrator can grant the minimum required **ttd**
team permissions. Do not grant administrator/owner access, other organisations,
native Gitea credentials, personal access tokens or SSH keys. The configuration
allowlist controls login; it does not grant repository permissions.

Mockporten uses one shared access password, not individual passwords. Anyone
holding it can authenticate as any allowed synthetic identity. Obtain access
from its operators; the password is entered at Mockporten and is never configured
in Designer.

Login is available at `/Login?provider=mockporten` and through the start-page link.
Repeated logins use the same account even though Mockporten changes `sub`.
Sessions expire with the token, do not refresh, and log out locally. Removing an
entry or disabling Mockporten rejects existing cookies on the next HTTP request
after the new configuration has reached that replica. Existing realtime
connections close at authentication expiry; removing an entry is not an instant
revocation of an already-open connection.

## Access restrictions

Normal repository/team authorization still applies. Additionally:

- Organisation-scoped Designer actions are restricted to `ttd`; repository and
  organisation lists are filtered accordingly.
- Global actions are denied unless explicitly allowed. New actions need review.
- Direct Gitea web, Git and API access is blocked for Mockporten sessions. Deploy
  the updated **gitea-proxy together with Designer before enabling the feature**.
- API keys, bot-account management, Studio/resource administration, copying apps and the
  AI assistant are unavailable in this initial implementation.
- Starting releases/builds and deployments is also blocked: those workflows
  create API keys for pipeline access. Supporting them needs separately scoped
  pipeline credentials; test identities must not escape the restriction through
  a background job. Reading existing `ttd` release/deployment status is allowed.
- Operations requiring Ansattporten organisation authorization, including the
  Maskinporten scope endpoints, are blocked. No Mockporten tokens or fabricated
  organisation claims are forwarded to Samarbeid API.

Production Studio can host these accounts, but the `ttd` restriction alone is
not proof that a repository contains only test data. Review accessible repositories
and team permissions before enabling shared test accounts there.

## Validation

Run the focused backend tests (database tests require Docker):

```sh
dotnet test tests/Designer.Tests/Designer.Tests.csproj --filter 'FullyQualifiedName~Mockporten'
```

From the repository root, run the proxy tests:

```sh
node --test src/gitea-proxy/test/mockporten.test.mjs
```

Before rollout, exercise a real browser login against Mockporten, an ordinary
Ansattporten login, account removal, expiry, `ttd` repository editing and denied
cross-organisation/direct Gitea access. This branch does not configure real test
identities or perform that live smoke test.
