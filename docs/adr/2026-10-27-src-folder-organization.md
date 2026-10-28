# Organization of the `/src` folder

- Status: Accepted
- Deciders: Team
- Date: 27.10.2026

## Result

A1, structure folders based on cluster. Additionally, local dev tools are grouped in `src/local`, and code used in multiple clusters is grouped in `src/common`. We also rename the Studio cluster to Core.

## Problem context

`altinn-studio` is a large monorepo with many components. It is important to organize the components in a logical and intuitive way so that developers and agents can reason well about them.

## Decision drivers

- D1: New developers can look at the folder structure to see the architecture at a glance.
- D2: It is immediately obvious where to place a hypothetical new service.
- D3: The different clusters in the monorepo can be understood by looking at the folder structure.
- D4: Components that work together are placed together.

## Alternatives considered

A1: One folder for each cluster. Additionally, local dev tools are grouped in `src/local`, and code used in multiple clusters is grouped in `src/common`:

```
altinn-studio/
├── .github/
│   └── workflows/
│       └── deploy-core-*.yaml         ← deploy-studio-*.yaml (8 files)
├── agents/                            (unchanged)
├── charts/                            (unchanged)
├── docs/                              (unchanged)
├── infra/
│   ├── core/                          ← infra/studio
│   ├── runtime/                       (unchanged)
│   ├── admin/                         (unchanged)
│   └── observability/
│       └── core/                      ← infra/observability/studio
├── scripts/                           (unchanged)
└── src/
    ├── core/                          + new folder
    │   ├── designer/                  ← src/Designer
    │   ├── assistant/                 ← src/AI/assistant
    │   ├── gitea/                     ← src/gitea
    │   ├── gitea-proxy/               ← src/gitea-proxy
    │   ├── gitea-runner/              ← src/ci/gitea-runner
    │   ├── runner-org-sync/           ← src/ci/runner-org-sync
    │   ├── load-balancer/             ← src/load-balancer
    │   ├── observability-proxy/       ← src/observability-proxy
    │   ├── operator/                  + new project
    │   ├── workflow-engine-operator/  + new project
    │   └── ci/
    │       ├── github-runner/         ← src/ci/github-runner
    │       ├── sandbox-node/          ← src/ci/sandbox-node
    │       └── lhci-server/           ← src/lhci-server
    │
    ├── runtime/                       + new folder
    │   ├── app/                       ← src/App
    │   │   ├── azure-pipelines/       ← src/App/azure-pipelines
    │   │   ├── backend/               ← src/App/backend
    │   │   ├── codelists/             ← src/App/codelists
    │   │   ├── docs/                  ← src/App/docs
    │   │   ├── fileanalyzers/         ← src/App/fileanalyzers
    │   │   ├── frontend/              ← src/App/frontend
    │   │   ├── template/              ← src/App/template
    │   │   ├── expression-tests/      ← src/common/expression-tests
    │   │   ├── test-apps/             ← src/test/apps
    │   │   └── k6/                    ← src/test/K6
    │   ├── workflow-engine-app/       ← src/Runtime/workflow-engine-app
    │   ├── gateway/                   ← src/Runtime/gateway
    │   └── operator/                  ← src/Runtime/operator
    │
    ├── platform/                      + new folder
    │   ├── storage/                   ← Altinn/altinn-storage
    │   ├── receipt/                   ← Altinn/altinn-receipt
    │   ├── file-scan/                 ← Altinn/altinn-file-scan
    │   └── pdf3/                      ← src/Runtime/pdf3
    │
    ├── common/
    │   ├── dotnet/                    (unchanged)
    │   ├── ts/                        (unchanged)
    │   ├── kubernetes-wrapper/        ← src/Runtime/kubernetes-wrapper
    │   └── workflow-engine/           ← src/Runtime/workflow-engine
    │
    └── local/                         + new folder
        ├── studioctl/                 ← src/cli
        ├── localtest/                 ← src/Runtime/localtest
        ├── devenv/                    ← src/Runtime/devenv
        ├── common/                    ← src/Runtime/common
        ├── augmenter-agent/           ← src/AI/augmenter-agent
        └── tools/                     ← src/tools
```

A2: Structure by components that are closely related. Additionally, local dev tools are grouped in `src/local`, and code used in multiple components is grouped in `src/common`:

```
altinn-studio/
├── .github/
│   └── workflows/
│       └── deploy-core-*.yaml              ← deploy-studio-*.yaml (8 files)
├── agents/                                 (unchanged)
├── charts/                                 (unchanged)
├── docs/                                   (unchanged)
├── infra/
│   ├── core/                               ← infra/studio
│   ├── runtime/                            (unchanged)
│   ├── admin/                              (unchanged)
│   └── observability/
│       └── core/                           ← infra/observability/studio
├── scripts/                                (unchanged)
└── src/
    ├── core/                               + new folder
    │   ├── designer/                       ← src/Designer
    │   ├── assistant/                      ← src/AI/assistant
    │   ├── gitea/                          ← src/gitea
    │   ├── gitea-proxy/                    ← src/gitea-proxy
    │   ├── gitea-runner/                   ← src/ci/gitea-runner
    │   ├── runner-org-sync/                ← src/ci/runner-org-sync
    │   ├── load-balancer/                  ← src/load-balancer
    │   ├── observability-proxy/            ← src/observability-proxy
    │   └── operator/                       + new project
    │
    ├── app/                                ← src/App
    │   ├── azure-pipelines/                ← src/App/azure-pipelines
    │   ├── backend/                        ← src/App/backend
    │   ├── codelists/                      ← src/App/codelists
    │   ├── docs/                           ← src/App/docs
    │   ├── fileanalyzers/                  ← src/App/fileanalyzers
    │   ├── frontend/                       ← src/App/frontend
    │   ├── template/                       ← src/App/template
    │   ├── expression-tests/               ← src/common/expression-tests
    │   ├── test-apps/                      ← src/test/apps
    │   ├── k6/                             ← src/test/K6
    │   ├── lhci-server/                    ← src/lhci-server
    │   └── pdf3/                           ← src/Runtime/pdf3
    │
    ├── runtime/                            + new folder
    │   ├── gateway/                        ← src/Runtime/gateway
    │   ├── operator/                       ← src/Runtime/operator
    │   ├── workflow-engine/                ← src/Runtime/workflow-engine
    │   ├── workflow-engine-app/            ← src/Runtime/workflow-engine-app
    │   └── workflow-engine-core-operator/  + new project
    │
    ├── platform/                           + new folder
    │   ├── storage/                        ← Altinn/altinn-storage
    │   ├── receipt/                        ← Altinn/altinn-receipt
    │   └── file-scan/                      ← Altinn/altinn-file-scan
    │
    ├── common/
    │   ├── dotnet/                         (unchanged)
    │   ├── ts/                             (unchanged)
    │   └── kubernetes-wrapper/             ← src/Runtime/kubernetes-wrapper
    │
    ├── ci/
    │   ├── github-runner/                  (unchanged)
    │   └── sandbox-node/                   (unchanged)
    │
    └── local/                              + new folder
        ├── studioctl/                      ← src/cli
        ├── localtest/                      ← src/Runtime/localtest
        ├── devenv/                         ← src/Runtime/devenv
        ├── common/                         ← src/Runtime/common
        ├── augmenter-agent/                ← src/AI/augmenter-agent
        └── tools/                          ← src/tools
```

## Pros and cons

### A1

- Good, because the top-level folders show which cluster runs each component (D1, D3).
- Good, because one question places a new service: which cluster runs it? Code for more than one cluster goes in `common/`, and code that is not deployed goes in `local/` (D2).
- Bad, because a folder does not always map to one cluster. `platform/` holds both the platform cluster and DIS Core, with DIS Edge in front, and pdf3's relay runs in the Runtime clusters although pdf3 sits in `platform/` (D3).
- Bad, because components that work together can end up apart. `lhci-server` only measures the App frontend but sits in `core/ci/`, and the workflow engine and its two hosts are in three different folders (D4).
- Bad, because `runtime/` mixes the App libraries, which ship inside every app, with the runtime services, which deploy on their own through release rings (D1).
- Bad, because a component moves when its deployment changes, for example to `common/` when it starts running in a second cluster (D2).

### A2

- Good, because components that work together are placed together, such as `lhci-server` with the App frontend it measures, and the workflow engine with its hosts (D4).
- Good, because the folders show the products, such as Designer, the App libraries and the runtime services (D1).
- Good, because shared code and local dev tools have fixed homes in `common/` and `local/` (D2).
- Bad, because the folders do not show which cluster runs a component. A reader has to look in the sync roots in `infra/` (D3).
- Bad, because "closely related" is a judgment call, so placing a new service takes a discussion. Designer reads `kubernetes-wrapper`, which runs in the Runtime clusters, and only apps use pdf3, which runs in DIS Core (D2).
- Bad, because `src/` is structured by component while `infra/` is structured by cluster, so a reader has to map between the two (D1, D3).
