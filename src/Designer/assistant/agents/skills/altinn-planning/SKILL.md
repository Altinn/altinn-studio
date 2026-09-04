---
description: How to plan an Altinn app change: which files are involved per task type, ordering, and validation strategy. Load first on unfamiliar or multi-file tasks.
title: Planlegging av app-endringer
---

# Altinn App Development Instructions

### Core Components

- **`App/Program.cs`**: Entry point using Altinn App Framework with custom service registrations for `IInstantiationProcessor` and `IInstanceValidator`
- **`App/models/model.cs`**: Auto-generated data model from XSD schema with dual JSON/XML serialization support
- **`App/logic/`**: Custom business logic handlers (instantiation, validation)
- **`App/ui/`**: Frontend layout definitions using Altinn's declarative JSON schema
- **`App/config/`**: Application metadata, process definition (BPMN), authorization policies

### Key Patterns

**Service Registration**: Custom services are registered in `RegisterCustomAppServices()` method in Program.cs:

```csharp
services.AddTransient<IInstantiationProcessor, InstantiationHandler>();
services.AddTransient<IInstanceValidator, ValidationHandler>();
```

**Data Model**: All model properties use both `[JsonProperty]` and `[JsonPropertyName]` attributes for compatibility, plus `[XmlElement]` for order-specific XML serialization.

**Form Layouts**: Multi-page forms defined in `ui/form/layouts/*.json` with Norwegian text resource bindings (e.g., `"1.1.1-Input.title"`).

**Validation**: Custom validation in `ValidationHandler.cs` using regex patterns for Norwegian-specific formats (phone numbers, org numbers).

## Critical Conventions

- **Namespace**: Always use `Altinn.App.*` namespaces for generated/custom code
- **Text Resources**: UI text stored in `config/texts/resource.nb.json` (Norwegian) referenced by keys in layouts
- **Options**: Dropdown/select options in separate JSON files under `options/` (e.g., `JaNei.json` for yes/no)
- **Process Flow**: Single data task process defined in `config/process/process.bpmn` with task ID `Task_1`

## Form Layout System

Forms use declarative JSON with component types like `Panel`, `Header`, `Input` with:

- **Data binding**: `dataModelBindings.simpleBinding` to model properties
- **Text resources**: `textResourceBindings.title` for i18n
- **Grid system**: Bootstrap-style responsive grid (`labelGrid`, `innerGrid`)
- **Validation**: `required` field with custom validation in ValidationHandler

Always reference existing layout files when adding new form components.

### Important — new pages need TWO things

When adding a new page layout under App/ui/form/layouts:

1. Add the page ID to the "pages.order" array in App/ui/form/Settings.json — otherwise the page is not part of the form's sequence.
2. Give the page a `NavigationButtons` component (typically the last component in the layout) — the order array only defines the sequence; without NavigationButtons the user has nothing to click to move between pages. The final page usually also gets a submit `Button`.

Both are required on every page of a multi-page form. `verify_changes` rejects a page in a multi-page flow that lacks a navigation component.

## Planning Requirements for Development

### 1. Which tool for which task

- **UI components** → `altinn_layout_props(component_type=…)` for the canonical property list before adding or editing any component
- **Data models** → edit `App/models/model.schema.json`, then `altinn_datamodel_sync` to regenerate model.xsd and model.cs — never hand-edit the generated files
- **Text content** → edit `App/config/texts/resource.<locale>.json` directly; update every locale the app has in the same change
- **Prefill** → `skill(altinn-prefill)` when pre-population from external sources is needed
- **Authorization / policy** → `skill(altinn-policy)`
- **Dynamic expressions** → `skill(altinn-expressions)`
- **Anything the skills don't cover** → `skill(altinn-docs)`, then `web_fetch` on URLs taken verbatim from its index

### 2. Validation strategy

- `verify_changes` after the last edit, always — it schema-validates layouts and text resources and checks page navigation
- On failure, fix the specific flagged rule with a targeted `edit_file`, then re-run
- `commit_session_branch` refuses to commit unverified changes

## Critical Development Reminders

- **Consider dependencies between layers** (datamodel → layout → resources)
- **Follow Altinn namespace conventions** (`Altinn.App.*`)
- **Reference existing layout files** when adding new components unless specified otherwise
- **Change the data model via model.schema.json + `altinn_datamodel_sync`** — the .cs and .xsd files are generated from it
- **Remember to update service registration in Program.cs** when adding new services

## Common Mistakes to AVOID

**DON'T**: Ask for React components or frontend code
**DON'T**: Create files without thorough searching first
**DON'T**: Assume file locations without exploring
**DON'T**: Ignore tool output in favor of general knowledge
**DON'T**: Create new schema URLs or metadata properties
**DON'T**: Skip the file discovery phase

**DO**: Search thoroughly before concluding files don't exist
**DO**: Explore directory structure systematically
**DO**: Validate against existing schemas and patterns
