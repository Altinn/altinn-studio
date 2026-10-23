# Continuous integration (`src/ci`)

Infrastructure and images used to execute Altinn Studio's GitHub and Gitea CI workloads.

| Folder            | Responsibility                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `github-runner`   | GitHub runner image, Sandbox coordinator and Kubernetes deployment.                                         |
| `gitea-runner`    | Gitea Actions runner image.                                                                                 |
| `runner-org-sync` | Reconciles Altinn organizations into Gitea runner configuration.                                            |
| `sandbox-host`    | Rust crate for Sandbox workloads on the sandbox nodes: the Provider setup, `sandbox-image` and host checks. |
| `sandbox-node`    | Prepares Sandbox worker nodes and exposes their host resources to Kubernetes.                               |

Follow the guidance inside each project where present. Keep runner-service-specific lifecycle logic in
the corresponding runner project. Host integration shared by Sandbox workloads belongs in `sandbox-node` on
the node and in `sandbox-host` inside the workload.
