# Studio library persistence

- Status: Replaces 007-studio-library-persistence
- Deciders: Team Altinn Studio
- Date: 04.09.2025

## Result

A6 - SQL database container with Custom API

## Problem context

There is a need to enable the publishing of static resources from Altinn Studio to a persistent storage separate from the app deployment.
Studio is launching "Studio Library", in which service owners may share resources across applications and organisations. The publishing of these resources needs to support immutability through pinning a version of a resource, as well as mutability by choosing to always opt for the "latest".
When choosing to use the "latest", it should not be required to redeploy an application.
Users must get an overview over published resources in Studio Library.

Diff from 007:
remove B9, add A5

## Decision drivers

A list of decision drivers. These are points which can differ in importance. If a point is "nice to have" rather than
"need to have", then prefix the description.

- B1: A user must be able to publish a resource which may be used in multiple applications
- B2: An application must be able to pin a version of a resource, and this resource must be immutable (per service owner).
- B3: An application must be able to require "latest version" of a resource, and get updates during runtime.
- B4: The endpoint for retrieving the resources should be open.
- B5: Nice to have: When using the "latest version", it should be faster to wait for the application to retrieve a new publish of the resource than redeploying the application
- B6: Need to have: The SLA for the persistent storage should not be worse than for the application.
- B7: A service owner pays for the storage of the resources they require
- B8: Users must get an overview over published resources in Studio Library - on the service owner organisations level

## Alternatives considered

List the alternatives that were considered as a solution to the problem context.

- A1: File publishing to CDN from Altinn Studio
- A2: A studio designer hosted API with ANY backing storage
- A3: A storage account in Azure with Nginx or custom API
- A4: Cluster hosted file persistence with Nginx
- A5: Cluster hosted file persistence with Custom API

## Pros and cons

List the pros and cons with the alternatives. This should be in regards to the decision drivers.

### A1 - File publishing to CDN from Altinn Studio

- Good, because it supports B1, B2, B4 and B6
- Bad, because in order to support B3 it requires increased complexity
  - Cache invalidation on distributed caching systems
- Bad, because it does not fulfill the nice to have B5
  - In Norway, Altinn CDN is refreshed every hour
- Bad, because it does not support B7
  - It is a complex issue knowing who uses a resource from Altinn CDN
- Neutral, because it supports B8 through filtering on "org-shortname"
  - However, this would result in getting all versions of all codelists for each request

### A2 - A studio designer hosted API with ANY backing storage

- Bad, does not fulfill the **need to have** decision driver B6. Studio does not have an SLA with comparable uptime as an application.

### A3 - A storage account in Azure with Nginx or custom API

- Good, because it supports B1, B3, B4, B5, B6 and B8
- Bad, because B2 leads to complexity in the implementation which goes against the purpose of a storage account
  - For immutability, we would need to duplicate data per organization
    - If service owner X publishes a code list and service owner Y wants to use it we need duplication in order to avoid X breaking production for Y
- Bad, because it does not support B7
  - It is a complex issue knowing who uses and should pay for using a resource from a shared storage account

### A4 - Cluster hosted file persistence with Nginx

- Good, because it supports B2, B3, B4, B5, B6, B7, B8
  - B3: updating the latest version would be the same complexity as any other file storage
  - B5: Publishing to the cluster should be faster than building and deploying the application to the same cluster
  - B7: Service owners will get this as a part of their cluster bill
- Bad, Nginx on its own does not support post/write operations
- Bad, does not efficiently support B8 - Nginx with autoindexing allows "get all file names from a path", but to see the content requires individual requests
- Neutral, redeploy on CVE fixes

### A5 - Cluster hosted file persistence with Custom API

- Good, because it supports B1, B2, B3, B4, B5, B6, B7, B8
  - B3: updating the latest version would be the same complexity as any other file storage
  - B5: Publishing to the cluster should be faster than building and deploying the application to the same cluster
  - B7: Service owners will get this as a part of their cluster bill
- Bad, maintainability, development time
- Neutral, redeploy on CVE fixes and bug fixes

### A6 - SQL database container with Custom API

- Good, because it supports B1, B2, B3, B4, B5, B6, B7, B8
  - B3: updating the latest version would be the same complexity as any other file storage
  - B5: Publishing to the cluster should be faster than building and deploying the application to the same cluster
  - B7: Service owners will get this as a part of their cluster bill
- Bad, maintainability, development time
- Neutral, redeploy on CVE fixes and bug fixes
