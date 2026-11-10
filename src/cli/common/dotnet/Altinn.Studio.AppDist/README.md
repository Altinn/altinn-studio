# Altinn.Studio.AppDist

Fetches and caches the app frontend distribution. [studioctl common](../../README.md) says what publishes it and what
uses this library.

Each version has two layers, cached separately. The content layer is the complete frontend distribution. The schemas
layer duplicates `schemas/**`, so validation tooling can fetch only that small part.

- `GetVersion` and `GetLayer` return `null` only when the version does not exist. They throw an `AppDistException`
  when the registry is unreachable or denies access, or the artifact is invalid.
- The provider does not cache a missing version, since a later publish can add it.
- Listing versions does not fall back to the cache. A caller that wants that catches
  `AppDistSourceUnavailableException` and calls `ListCachedVersions`.
- Version lists hold only tags that are valid Semantic Versioning 2.0.0, ordered by precedence.
