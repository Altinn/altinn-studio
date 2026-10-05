# Glossary map

## Contexts

Each context's `GLOSSARY.md` is created when its first term is resolved; until then the path below doesn't exist.

- Designer (`src/Designer/GLOSSARY.md`): Altinn Studio Designer, where users build apps (forms, data models, policies, BPMN processes) and deploy them
- App (`src/App/GLOSSARY.md`): the Altinn 3 app runtime every deployed service builds on (backend libraries and form renderer)
- Runtime (`src/Runtime/GLOSSARY.md`): runtime and platform services supporting apps in production and local development
- CLI (`src/cli/GLOSSARY.md`): `studioctl`, the local-dev CLI for cloning, running, and testing apps locally
- Tools (`src/tools/GLOSSARY.md`): standalone utilities used by the Studio team
- Common (`src/common/GLOSSARY.md`): repository-wide shared code

## Relationships

- **Designer → App**: Designer generates and deploys apps that are built on the App runtime
- **App → Runtime**: apps depend on the Runtime and platform services, emulated locally by `localtest`
- **CLI → App, Runtime**: `studioctl` runs apps locally against the local Runtime services
- **Common ↔ all**: shared code used across contexts
