# Continuous integration (`src/ci`)

Infrastructure and images used to execute Altinn Studio's GitHub and Gitea CI workloads.

| Folder | Responsibility |
| --- | --- |
| `github-runner` | GitHub runner image, Sandbox coordinator and Kubernetes deployment. |
| `gitea-runner` | Gitea Actions runner image. |
| `runner-org-sync` | Reconciles Altinn organizations into Gitea runner configuration. |
| `sandbox-node` | Prepares Sandbox worker nodes and exposes their host resources to Kubernetes. |

Follow the guidance inside each project where present. Keep runner-service-specific lifecycle logic in
the corresponding runner project; `sandbox-node` owns only host integration shared by Sandbox workloads.
