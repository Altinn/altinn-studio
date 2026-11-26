# Core

Components that run in a Studio cluster, the control plane of Altinn Studio. The
[src folder ADR](../../docs/adr/2026-10-27-src-folder-organization.md) moves the rest of Core here over time.

- [preview](preview/README.md) shows an app the way its developer is building it in Designer. It runs on a domain of
  its own, so the app's own scripts can't act on Studio.
