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
* Lacking setup in terms of High Availability and observability (mainly due to change in needs and lots of changes in the ecosystem)

As we start focusing on operational insight and monitoring/observability capabilities in Altinn Studio,
we also need to ensure we have good infra and High Availability to support the tools we give service owners.
We can describe the current (and goal) architecture in terms of 2 planes:

* Control plane
  * Designer application
  * Anything which involves development, publishing and monitoring capabilities
* Data plane
  * App clusters, Studio apps and runtime components such as the PDF generator
  * In essence, any component relied upon by the app during runtime (while processing user requests and during service tasks)

From this POV, we can say that the data plane has strict requirements in terms of availability and reliability.
Evaluating the needs of the control plane is a little more nuanced, and is primarily related to impact/effect on data plane:

* Capabilities related to development of apps are not critical
* Monitoring and observability capabilities are critical (discovering issues in published apps)
* Publishing capabilities are critical (fixing issues in published apps)
* Source repositories/Gitea is critical (hotfixing, config source)

### Current inventory

* Kubernetes cluster
  * Gitea along with PVCs
  * Storage classes with CSI providers for Azure Storage Account
  * Secrets
  * Separate nodepools
    * 1 for Gitea Runners
    * 1 for Designer, Gitea and other services
  * Flux
  * Various deployments
* Application Insights
* Key Vault
* Storage Accounts (files, blobs)
* Premium Managed Disk (for Gitea)
* Redis Cache
* PostgreSQL Flexible Server DB

### Planned/wanted architectural changes

* Flux syncroot pattern for deployment of services
* Workload identity across the board
  * Preferably also for PostgreSQL, to avoid credentials
* Private networking by default?
* Separate nodepool/VM for Gitea?
* KEDA (or similar) autoscaling for Gitea Runners
* Azure Key Vault secrets store CSI driver
* General organizational improvements in k8s (namespaces, SA, network policies, ...)
* Linkerd/service mesh between services for mTLS
* Ingress controller as opposed to custom nginx config
* Telemetry and instrumentation through OTel and OTel collector or similar
  * Ideally telemetry for both infra and services end up in the same place
* Continuous container scanning features (e.g. Trivy operator)
+ Any other recommendations by the Platform team

### Questions

* Collaboration model? What can/should we do ourselves, when do we ask Platform

## Decision drivers

- B1: Improved security posture
- B2: Less maintenance burden, more time towards product roadmap
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
- Bad, less control over infra
  - Fundamentally we will have less control, this is the tradeoff we're making (in a sense we want less control, but still want to be able to innovate, and that sometimes requires infra)
  - DIS still intends to offer flexibility through "DIS-yaml" or similar (provisioning common infra such as DBs)
  - Syncroot pattern offers a lot of flexibility and self-service already
  - Could we still have an area/reosurce group in Azure with some degree of control? E.g. for PoC stuff

### A2

- Good, lots of flexibility, access to all the tech/infra we want
- Bad, because we would have to spend more time on infra and less time on our roadmap, while in all probability delivering worse quality
- Bad, we don't have specialist skills/competence
