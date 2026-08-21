# Centralize Altinn Studio-owned runtime configuration for apps in Kubernetes and GitOps

- Status: Proposed
- Deciders: Team Altinn Studio
- Date: 24.03.2026

## Result

- A2: Altinn Studio-owned runtime configuration for apps shall be managed centrally in Kubernetes through GitOps.
- File-based mounted configuration is the preferred delivery mechanism for shared runtime settings that may change after app deployment.
- Environment variables remain allowed for bootstrap settings and transitional compatibility, but `envFrom` for shared runtime configuration should be phased out.

## Problem context

Altinn apps depend on runtime configuration that is not really owned by the app developer, such as platform URLs, logout-related endpoints, PDF generator endpoints, external app URLs, and other environment-specific addresses. These values are part of the runtime contract around the app and should therefore be owned and changed by Team Altinn Studio, not hardcoded in app source code or baked into deployment-time pipelines.

This is especially important for apps because we do not control all app code and we do not redeploy all apps when shared runtime configuration changes. When these values live in app source code or are injected only at deploy time, changing them becomes slow, fragile, and uneven across tenants.

We have already moved in this direction:

- `src/App/azure-pipelines/deploy-app.yaml` no longer injects the broader shared runtime configuration during deployment in the way it previously did. Shared configuration is instead sourced from Kubernetes configuration managed under `infra/runtime/apps-config/`.
- `src/App/backend/src/Altinn.App.Api/Extensions/WebHostBuilderExtensions.cs` now loads JSON configuration files from a mounted runtime directory so runtime configuration can be updated independently of app deployment.

This ADR is about runtime configuration owned by Team Altinn Studio for apps.

Historical issues show why this matters:

- A logout URL was hardcoded in app frontend code and had to be patched manually on the CDN.
- A deprecated Maskinporten environment required source changes.
- An old PDF generator address was configured directly in the deploy pipeline, and not all apps were updated because they had not been redeployed leading to complexities in PDF migration.

## Decision drivers

- D1: Runtime configuration owned by Team Altinn Studio should be centrally owned and changeable by us in one place
- D2: Shared runtime configuration should be changeable without requiring app source changes
- D3: Shared runtime configuration should be changeable without requiring app redeployment
- D4: The solution should fit our existing Kubernetes and GitOps operating model
- D5: Runtime code should support configuration reload where the framework supports it

## Alternatives considered

- A1: Keep shared runtime configuration in app source code or deployment pipeline injection
- A2: Centralize Team Altinn Studio-owned runtime configuration in Kubernetes, manage it through GitOps, and prefer file-based mounts into apps
- A3: Use environment variables only, managed centrally in Kubernetes through GitOps

## Pros and cons

### A1: Keep shared runtime configuration in app source code or deployment pipeline injection

- Good, because it can support D2 for newly deployed apps by injecting environment-specific values at deploy time
- Bad, because it does not satisfy D1 well since the configuration is split across app source code and deployment pipelines instead of being owned in one place
- Bad, because it does not satisfy D2 well when shared runtime configuration is hardcoded in app source code
- Bad, because it does not satisfy D3 since changes often require app redeployment before they take effect
- Bad, because it does not satisfy D4 well since deploy-pipeline injection is less aligned with GitOps-managed runtime configuration in Kubernetes
- Bad, because it does not satisfy D5 well since deploy-time injection and hardcoded values do not support runtime reload
- Bad, because the operational problems we have seen are a direct result of weak support for D1, D2, and D3

### A2: Centralize Team Altinn Studio-owned runtime configuration in Kubernetes, manage it through GitOps, and prefer file-based mounts into apps

- Good, because it satisfies D1 by keeping Team Altinn Studio-owned runtime configuration under our control
- Good, because it satisfies D2 by moving shared runtime configuration out of app source code
- Good, because it satisfies D3 better than deploy-time injection
- Good, because it satisfies D4 by aligning with the Kubernetes and GitOps model we already use
- Good, because it satisfies D5 by supporting reload-friendly runtime patterns such as .NET configuration reload and `IOptionsMonitor`
- Good, because it satisfies D1 and D4 by giving a clear operational model: change config centrally in Kubernetes through GitOps and let runtime consume it
- Good, because it still allows environment variables where needed without changing the target pattern, which helps migration without undermining D1-D5
- Bad, because D5 still depends on runtime support in the consuming code, so not every configuration consumer will reload automatically
- Bad, because D3 is only partially satisfied during migration while both file-based config and `envFrom` exist
- Bad, because it requires deployment and runtime support for mounted configuration, which adds some implementation cost even if it aligns best with D1-D5

### A3: Use environment variables only, managed centrally in Kubernetes through GitOps

- Good, because it satisfies D1, D2, and D4 better than app source code or deploy-pipeline injection
- Good, because it keeps the configuration model simple and familiar while still satisfying D1 and D4 reasonably well
- Bad, because it satisfies D3 poorly in Kubernetes since environment variable updates typically require pod restarts
- Bad, because it does not satisfy D5 as well as file-based mounted configuration
- Bad, because it gives us less flexibility than A2 for D3 and D5 in runtimes that can reload mounted files automatically

## Decision rationale

We propose A2.

The main reason is ownership. Shared runtime configuration for apps is part of the runtime contract around the app and should therefore be managed by Team Altinn Studio, not copied into app source code and not buried in deployment pipelines.

Kubernetes and GitOps are already our infrastructure model, so the most coherent solution is to keep this configuration there as well. Within that model, file-based mounted configuration is preferred over environment variables for shared runtime settings that may need to change after deployment. This gives us better flexibility and a better fit with runtime reload mechanisms.

This is not a claim that environment variables are wrong. They remain valid for bootstrap values, secrets, and compatibility during migration. The point is narrower: for shared runtime configuration owned by Team Altinn Studio and used by apps, mounted files should be the default target pattern and `envFrom` should be treated as transitional.

## App-specific configuration and secrets

This ADR mainly covers shared runtime configuration owned by Team Altinn Studio. App-specific configuration and secrets still need a separate preparation mechanism.

For app-specific configuration, we will use the operator or another asynchronous mechanism to prepare the configuration before or alongside runtime consumption, instead of pushing that responsibility into the deploy pipeline.

The app Helm chart currently includes a mandatory secret named `<serviceowner>-<app>-deployment-secrets`. Files from this secret are mounted automatically and picked up by apps during runtime. This gives us a separate path for app-specific secret config while keeping shared runtime configuration centralized under `infra/runtime/apps-config/`.

## Consequences and migration

- Shared runtime configuration should be defined centrally under infrastructure owned by us, currently `infra/runtime/apps-config/`
- New shared runtime configuration for apps should not be introduced through deploy-time pipeline injection unless there is a clear short-term exception
- App runtime code should prefer reading mounted configuration files for runtime settings owned by Team Altinn Studio
- `envFrom` may remain during migration, but the target state is that shared runtime configuration is file-based by default
- App-specific business configuration remains the responsibility of the app and is outside the scope of this ADR
