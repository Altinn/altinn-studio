# Use Storage-owned references to immutable data element content

- Status: Proposed
- Deciders: Team Altinn Studio
- Date: 2026-05-20

## Result

A2: Storage creates and persists a Storage-owned content version reference before each blob upload, and uses that reference in the blob path. The stable data element id remains unchanged. The current data element points to the committed content version reference in the database.

## Problem context

When a data element is created or updated, Storage must both persist the blob content and update the data element metadata in the database. We want the database update to happen inside a short-lived transaction. This decision is intended to make it possible for later implementation work to check the current state of the instance and data element immediately before committing the update, without keeping the transaction open while uploading blob content.

Some updates must be rejected after the blob has already been uploaded. This can happen if the instance or data element state no longer allows the update when Storage reaches the database transaction. If the data element uses a mutable blob path, the new content may already be visible through Storage read paths before the database transaction decides whether the update should be committed. Rolling the metadata back would not be enough, because a caller may already have downloaded content that should never have become the current data element content.

Keeping the database transaction open while uploading the blob would avoid that specific race, but it would make the transaction depend on a remote operation. We want to avoid long-lived transactions around blob uploads.

Mutable blob paths can also make the database metadata and blob content disagree after partial failures. For example, Storage could upload new content and then crash before updating the data element metadata. The same can happen if the database is unavailable when Storage attempts to commit the metadata update.

Storage therefore needs a stable reference to blob content that cannot be changed after upload. The alternatives differ in where that reference comes from: Azure Blob Storage can provide a version ID for uploaded content, or Storage can create its own content version reference and use it in the blob path. In either case, the database should decide which content reference is the current version of a data element.

The data element id remains the stable identity used by Storage APIs. The content reference is a separate value that identifies the blob content for that data element. Storage read paths must resolve blob content from the reference committed in the database, not from the stable data element id alone.

## Decision drivers

- B1: Data element updates must be commit/rollback safe without long-lived database transactions.
- B2: Storage read paths must only observe blob content that the database has committed as the current content version for the data element.
- B3: Partial failures must not make the current database metadata point at different content than intended.
- B4: The database should remain the source of truth for the current content version of a data element.
- B5: The solution should be testable with local tooling such as Azurite.
- B6: The solution should avoid unnecessary lock-in to Azure-specific blob features.
- B7: Old and abandoned content versions should be possible to identify and clean up reliably.

## Alternatives considered

- A1: Use Azure Blob Storage version IDs as references to immutable blob content.
- A2: Create a Storage-owned content version reference before upload and use it in the blob path.
- A3: Continue overwriting a mutable blob path for each data element.

## Pros and cons

### A1: Use Azure Blob Storage version IDs as references to immutable blob content

- Good, because it supports B1 and B2 by giving Storage a reference to blob content that cannot be changed after upload.
- Good, because it supports B3 better than overwriting a mutable blob path.
- Good, because the database can store the Azure version ID as the committed content version reference.
- Bad, because it does not support B5. Azure Blob Storage version IDs are not supported by Azurite, which makes local and automated testing harder.
- Bad, because it does not support B6. The data model and lookup behavior would depend on Azure-specific blob versioning.
- Bad, because cleanup would depend on Azure-specific blob version listing and semantics. Storage may upload a new Azure blob version but fail before updating the database, or try to roll back an update but fail to delete the uploaded blob version.
- Bad, because the newest Azure blob version is not necessarily the version referenced by the data element in the database, so cleanup must compare Azure blob versions with database references.

### A2: Create a Storage-owned content version reference before upload and use it in the blob path

- Good, because it supports B1. Storage can persist a new content version reference, upload to the corresponding blob path, and then open the short-lived database transaction that decides whether the data element should point to that content version.
- Good, because it supports B2. Storage read paths only observe the new content after the database has committed the data element update pointing to the new content version reference.
- Good, because it supports B3. If Storage crashes after blob upload but before the database update, the current data element still points to the previously committed content version.
- Good, because it supports B4. The database stores the committed content version reference on the data element and remains the source of truth for which blob path is current.
- Good, because it supports B5. The reference is controlled by Storage and does not require Azure Blob Storage version ID support in Azurite.
- Good, because it supports B6. The model depends on ordinary blob paths, not provider-specific blob versioning.
- Good, because it supports B7. Old and abandoned content versions can be found by looking for stored content version references that are not referenced by any current data element.
- Bad, because Storage must create and persist explicit content version references.
- Bad, because blob paths become versioned and cleanup logic must account for content version rows with missing blobs and blob content versions that are not referenced by any current data element.

### A3: Continue overwriting a mutable blob path for each data element

- Good, because it is simple and requires no new content version reference model.
- Bad, because it does not support B1. Safe rollback would require a long-lived database transaction or compensating logic that cannot prevent Storage read paths from observing the overwritten content.
- Bad, because it does not support B2. A rejected update may already have been downloaded from the mutable blob path.
- Bad, because it does not support B3. A crash or database outage after blob upload can leave the database metadata pointing to content it did not commit.
- Bad, because it does not support B4. The blob path itself becomes the effective source of truth for current content during parts of the update flow.
- Good, because it supports B5 and B6 by not requiring Azure-specific blob versioning features.
- Good, because it avoids B7 cleanup complexity in Storage. There are no distinct Storage-managed versions to reason about or clean up.

## Decision rationale

The decision favors A2.

Storage will create a unique content version reference before each blob upload. The reference is inserted into a content version table before uploading to Azure Blob Storage. This insert is outside the later transaction that updates the current data element metadata.

The blob is uploaded to a path containing the content version reference, and that path must not later be overwritten with different content. The content version reference must be unique, and Storage must not reuse it for another upload. After the upload, Storage opens a short-lived database transaction. If the update is still allowed, the transaction commits the data element metadata with the new content version reference.

If the transaction is rejected or Storage fails before the database update is committed, the current data element still points to the previously committed content version. The uploaded but unreferenced content version can later be identified from the content version table and removed by cleanup.

This keeps the blob upload outside the short-lived database transaction while still making the database commit the only point where new content becomes current for a data element.
