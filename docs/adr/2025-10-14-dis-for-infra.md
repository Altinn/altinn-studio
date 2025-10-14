# Use DIS for Studio infrastructure

- Status: Proposed
- Deciders: Squad Kjøring
- Date: 14.10.2025

## Result

We will use DIS for Altinn Studio infrastructure

## Problem context

We have some issues with the current infrastructure used in Altinn Studio:

* Less than ideal config from security POV (e.g. Azure Defender score)
* Maintenance burden (not many have extensive Azure/cloud-native experience)

As we start focusing on operational insight and monitoring/observability capabilities in Altinn Studio,
we also need to ensure we have good infra and High Availability to support the tools we give service owners.
We can describe the current (and goal) architecture in terms of 2 planes:

* Control plane
  * Designer application
  * Anything which involves development, publishing and monitoring capabilities
* Data plane
  * App clusters, Studio apps and runtime components such as the PDF generator
  * In essence, any component relied upon by the app during runtime (while processing user requests and during service tasks)

From this POV, we can say that the data plane has strict requirements in terms of availability and reliability,
while evaluating the needs of the control plane needs a little more nuance:

* Capabilities related to development of apps does not have the same operational requirements
* Monitoring and observability capabilities are critical

### Current inventory

* Azure Kubernetes Cluster
  * Gitea along with PVCs
  * Storage classes with CSI providers for Azure Storage Account
  * Secrets
  * Separate nodepools
    * 1 for Gitea Runners
    * 1 for Designer and other services
  * Flux
  * Various deployments
* Application Insights
* Key Vault
* Storage Accounts
* Premium Managed Disk (for Gitea)
* Redis Cache
* PostgreSQL Flexible Server DB

### Planned/wanted architectural changes

* Flux syncroot pattern for deployment of services
* Separate nodepool/VM for Gitea?
* Workload identity across the board
* KEDA (or similar) autoscaling for Gitea Runners
* Azure Key Vault secrets store CSI driver
* General organizational improvements in k8s
* Linkerd/service mesh between services
* Ingress controller as opposed to nginx config
* Telemetry and instrumentation through OTel and OTel collector or similar
+ any other recommendations by platform team

## Decision drivers

- B1: Improved security posture
- B2: Less maintenance burden
- B3: Access to skills/competence in the Azure/cloud-native space
- B4: Access to new tech/infra that can enable innovation

## Alternatives considered

- A1: Use DIS
- A2: Keep existing setup (custom Terraform setup)

In theory there could be a third alternative here, the team could hire people with the required skillsets,
but that would be organizationally inefficient considering the existing capabilities in DigDir.

## Pros and cons

### A1

- Good, adheres to all decision drivers
- Bad, some upfront cost in terms of time spent planning and executing migration

### A2

- Bad, because we would have to spend more time on infra and less time on our roadmap, while in all probability delivering worse quality
