# Altinn domain library

Code: `src/AI/assistant/agents/altinn/app_version/`, `src/AI/assistant/agents/altinn/layout/`, `src/AI/assistant/agents/altinn/resources/`, `src/AI/assistant/agents/altinn/findings.py`

This library is plain Python with no model calls. The tools call it in the same process. It does three jobs: it finds the app version, validates layouts against the official schema, and validates text resources. The text resource validator returns its errors as findings. [Tools](tools.md) describes how `verify_changes` uses the findings.

```mermaid
flowchart TD
  A["Read the *.csproj files"] --> B["Find the Altinn.App.Api version"]
  B --> C{"Major version 9 or more?"}
  C -- Yes --> D["V9_PROFILE"]
  C -- "No, or not found" --> E["V8_PROFILE"]
```

_App version detection. It follows the same rule as Designer._

A version profile holds what the assistant does differently per app version. The v8 schemas come from the app frontend v4 toolkit on `altinncdn.no`. The v9 schemas come from `src/common/ts/layout-contract` in this repository. The service keeps a loaded schema in memory for 1 hour.
