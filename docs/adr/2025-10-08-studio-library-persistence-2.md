# Studio library persistence

- Status: Replaces 2025-09-04-studio-library-persistence
- Deciders: Team Altinn Studio
- Date: 08.10.2025

## Result

A3 - A storage account in Azure with public availability over HTTP

## Problem context

There is a need to enable the publishing of static resources from Altinn Studio to a persistent storage separate from the app deployment.
Studio is launching "Studio Library", in which service owners may share resources across applications and organisations.
The publishing of these resources needs to support immutability through pinning a version of a resource, as well as mutability by choosing to always opt for the "latest".
When choosing to use the "latest", it should not be required to redeploy an application.
Users must get an overview over published resources in Studio Library.

Diff from 007:
Remove payment driver (B7) and public marketplace driver (B9), add alternatives A5 and A6.

## Decision drivers

A list of decision drivers. These are points which can differ in importance. If a point is "nice to have" rather than
"need to have", then prefix the description.

- B1: A user must be able to publish a resource which may be used in multiple applications.
- B2: An application must be able to pin a version of a resource, and this resource must be immutable (per service owner).
- B3: An application must be able to require "latest version" of a resource, and get updates during runtime.
- B4: The endpoint for retrieving the resources should be open.
- B5: Nice to have: When using the "latest version", it should be faster to wait for the application to retrieve a newly published version of the resource than redeploying the application.
- B6: Need to have: The SLA for the persistent storage should not be worse than for the application.
- B7: Users must get an overview over published resources in Studio Library - on the service owner organisations level.

## Alternatives considered

List the alternatives that were considered as a solution to the problem context.

- A1: File publishing to CDN from Altinn Studio
- A2: A studio designer hosted API with ANY backing storage
- A3: A storage account in Azure with public availability over HTTP
- A4: Cluster hosted file persistence with Nginx
- A5: Cluster hosted file persistence with Custom API
- A6: SQL database container with Custom API

## Pros and cons

List the pros and cons with the alternatives. This should be in regard to the decision drivers.

### A1 - File publishing to CDN from Altinn Studio

- Good, because it supports B1, B2, B4 and B6
- Bad, because in order to support B3 it requires increased complexity
  - Cache invalidation on distributed caching systems
- Bad, because it does not fulfill the nice to have B5
  - In Norway, Altinn CDN is refreshed every hour
- Neutral, because it supports B7 through filtering on "org-shortname"
  - However, this would result in getting all versions of all codelists for each request

### A2 - A studio designer hosted API with ANY backing storage

- Bad, does not fulfill the **need to have** decision driver B6. Studio does not have an SLA with comparable uptime as an application.

### A3 - A storage account in Azure with public availability over HTTP

- Good, because it supports B1, B3, B4, B5, B6
- Neutral, because B2 and B7 leads to complexity in the implementation
  - B2: For immutability, we would need to duplicate data per organisation. If service owner X publishes a code list and service owner Y wants to consume it, duplication is necessary so that changes introduced by X cannot break production for Y.
  - B7: We will need to manage the creation and updates of index files.

### A4 - Cluster hosted file persistence with Nginx

- Good, because it supports B2, B3, B4, B5, B6
  - B3: updating the latest version would be the same complexity as any other file storage
  - B5: Publishing to the cluster should be faster than building and deploying the application to the same cluster
- Bad, Nginx on its own does not support post/write operations
- Neutral, requires management of the creation and updates of index files.
- Neutral, redeploy on CVE fixes

### A5 - Cluster hosted file persistence with Custom API

- Good, because it supports B1, B2, B3, B4, B5, B6, B7
  - B3: updating the latest version would be the same complexity as any other file storage
  - B5: Publishing to the cluster should be faster than building and deploying the application to the same cluster
- Bad, maintainability, development time
- Neutral, redeploy on CVE fixes and bug fixes

### A6 - Container with SQL database and a Custom API

- Good, because it supports B1, B2, B3, B4, B5, B6, B7
  - B3: updating the latest version would be the same complexity as any other file storage
  - B5: Publishing to the cluster should be faster than building and deploying the application to the same cluster
- Bad, maintainability, development time
- Neutral, redeploy on CVE fixes and bug fixes
