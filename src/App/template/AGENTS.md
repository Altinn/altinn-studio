# AGENTS.md — app-template-dotnet (`src/App/template`)

The **.NET app scaffolding template** (`app-template-dotnet`, .NET 8) that Altinn Studio (the Designer)
uses to generate new Altinn 3 apps and to build their Docker images. It is the starting skeleton every
new app is created from.

Part of the [App runtime](../AGENTS.md).

## ⚠️ Production-critical branch

The Designer uses this template when building an app's Docker image, and the Designer is
**continuously deployed**. Therefore **the `main` branch must always be production-ready** — a broken
template on `main` breaks app builds for everyone. Be conservative with changes here and verify a
template-generated app still builds.

## What it contains

The skeleton of a runnable Altinn 3 app: the `App` project referencing the
[Altinn.App backend libraries](../backend/AGENTS.md), default configuration, process/BPMN,
data model wiring, and the Dockerfile used to build the app image. Optional feature libraries such as
[codelists](../codelists/AGENTS.md) and [fileanalyzers](../fileanalyzers/AGENTS.md) plug in on top.

## Working here

- Keep the template minimal and generic — it is a starting point, not a showcase.
- Changes that bump the referenced Altinn.App library version or alter the build must be validated
  end-to-end (generate an app, build its image) before landing on `main`.
