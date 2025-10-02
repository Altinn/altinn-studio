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

## Planning Requirements for Development

### 1. Required Tool Usage Patterns
- **UI components** → `layout_components_tool` to find appropriate Altinn components
- **Data models** → `datamodel_tool` to create/update model.cs, model.xsd, model.schema.json
- **Text content** → `resource_tool` to manage Norwegian text resources and translations
- **Configuration** → `prefill_tool` when pre-population from external sources needed
- **Authorization** → `policy_tool` for access control and role-based permissions
- **Layout Property Context** → `layout_properties_tool` to get info on available properties for layout components
- **Dynamic Expressions** → `dynamic_expression_tool` to create dynamic expressions
- **Schema Validation** → `schema_validator_tool` to validate XSD schemas
- **Policy Validation** → `policy_validation_tool` to validate policies
- **Policy Summarization** → `policy_summarization_tool` to summarize policies
- **Studio Examples** → `studio_examples_tool` to get examples of C# logic from existing Altinn Studio apps. Very relevant for writing C# logic.
- **AppLib Examples** → `app_lib_examples_tool` to get examples of for relevant C# code from the Altinn AppLib. Very relevant for writing C# logic.


### 2. Testing Requirements
- Run app locally with `dotnet run --project App` before testing
  - If the app crashes, fix the issue before running playwright tests
- Test with Playwright MCP until requirements are fulfilled
- Default app path: http://local.altinn.cloud
- Always select a test user (default: person representing organization)
- Use Playwright to ensure that all components are visible and functional
- Test that all fields set up to be prefilled are prefilled with correct content
- Test that all dynamic expressions are working as expected
- Test that available languages (Norwegian/English) are working as expected
- Verify validation rules work correctly for Norwegian formats
- Note that the app must be restarted after making changes to the app

## Critical Development Reminders

- **Always test with Playwright until requirements are fulfilled**
- **Always specify required tools in the plan**
- **Consider dependencies between tools** (datamodel → layout → resources)
- **Follow Altinn namespace conventions** (`Altinn.App.*`)
- **Reference existing layout files** when adding new components unless specified otherwise
- **Update all three datamodel files** when making model changes (model.cs, model.xsd, model.schema.json)
- **Use Schema Validator Tool** to validate XSD schemas after updating them
- **Remember to update service registration in Program.cs** when adding new services

## Common Mistakes to AVOID
**DON'T**: Ask for React components or frontend code
**DON'T**: Create files without thorough searching first  
**DON'T**: Assume file locations without exploring
**DON'T**: Ignore MCP tool context in favor of general knowledge
**DON'T**: Create new schema URLs or metadata properties
**DON'T**: Skip the file discovery phase

**DO**: Search thoroughly before concluding files don't exist
**DO**: Follow MCP tool examples exactly
**DO**: Explore directory structure systematically
**DO**: Validate against existing schemas and patterns