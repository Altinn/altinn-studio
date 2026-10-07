# Altinn Studio documentation

Documentation for developing Altinn Studio. Agent-specific guidance lives in `AGENTS.md` files and skills, see
[the documentation structure ADR](adr/2026-10-07-documentation-structure.md). Documentation for service owners
and app developers is on [docs.altinn.studio](https://docs.altinn.studio).

## Architecture decision records

Start a new ADR from [the template](adr/yyyy-mm-dd-template.md).

- [Configuration of a signing task - Task and interface coupling](adr/2024-09-25-signing-configuration.md)
- [Internal handling of the signing interface](adr/2024-09-25-signing-interface.md)
- [How we handle transactions for signing](adr/2024-10-02-signing-transaction-handling.md)
- [Introduce component library](adr/2024-10-17-app-component-library.md)
- [Configuration of correspondence resource for signing tasks - Environment-specific configuration](adr/2025-06-12-environment-specific-config.md)
- [Delegation notification for application instance access - User discovery and navigation](adr/2025-06-12-signing-notify-delegatee.md)
- [Studio library persistence](adr/2025-09-04-studio-library-persistence.md)
- [Move most initial data loading to app-backend](adr/2025-09-23-backend-data-initialization.md)
- [Studio library persistence, part 2](adr/2025-10-08-studio-library-persistence-2.md)
- [Adopt Go for cloud-native runtime services and tooling](adr/2025-10-17-using-go.md)
- [Adopt two-tier Go-based PDF generation architecture](adr/2025-10-22-pdf-generation-architecture.md)
- [Frontend Performance Monitoring Strategy](adr/2025-11-25-frontend-performance-monitoring-strategy.md)
- [New way of getting code lists](adr/2025-12-09-altinn-3-code-list.md)
- [Monitoring telemetry collection and distribution](adr/2026-01-07-monitoring-telemetry-collection-distribution.md)
- [Internationalization in app-components](adr/2026-02-19-app-components-i18n.md)
- [Translation key props use a branded type validated by an ESLint rule](adr/2026-02-24-translation-key-validation.md)
- [Studio AI assistant infrastructure](adr/2026-05-07-ai-assistant-infrastructure.md)
- [Support mapping and filtering in Altinn Studio expressions](adr/2026-05-11-maps-and-filters-in-expressions.md)
- [Run non-critical process-next side effects in non-blocking side-effects workflows](adr/2026-07-10-workflow-engine-noncritical-side-effects.md)
- [Durable yield: a first-class "waiting" outcome for workflow-engine steps](adr/2026-07-23-workflow-engine-durable-yield.md)
- [Keep the instance id as the eFormidling shipment id](adr/2026-07-24-eformidling-shipment-id.md)
- [Failure-storm throttling: a namespace circuit breaker for the workflow engine](adr/2026-08-13-workflow-engine-failure-throttling.md)
- [Documentation structure for Altinn Studio product development](adr/2026-10-07-documentation-structure.md)

## Diagrams

- [apps-gitops-release.excalidraw.svg](diagrams/apps-gitops-release.excalidraw.svg)
- [dataflyt.excalidraw.svg](diagrams/dataflyt.excalidraw.svg)
- [eformidling-integration-flow.drawio.svg](diagrams/eformidling-integration-flow.drawio.svg)
- [kata-runners.excalidraw.svg](diagrams/kata-runners.excalidraw.svg)
- [new-pdf.excalidraw.svg](diagrams/new-pdf.excalidraw.svg)
- [proxy-architecture.excalidraw.svg](diagrams/proxy-architecture.excalidraw.svg)
- [studioctl.excalidraw.svg](diagrams/studioctl.excalidraw.svg)
- [studio-assistant/agent-flow.md](diagrams/studio-assistant/agent-flow.md)
- [studio-assistant/agent-service-flow.svg](diagrams/studio-assistant/agent-service-flow.svg)
- [studio-assistant/assistant-sequence.png](diagrams/studio-assistant/assistant-sequence.png)
