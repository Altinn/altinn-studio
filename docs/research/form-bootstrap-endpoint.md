# Research: Form Bootstrap Endpoint

## Overview

This document investigates moving the complex form data loading from the frontend to a consolidated backend endpoint (or pair of endpoints).

**Goal**: Dramatically simplify frontend data loading by providing a single endpoint that returns all data needed to render a form, replacing the current waterfall of 10+ nested providers making separate requests.

---

## Current State Analysis

### Frontend Data Loading Flow

The `FormContext.tsx` uses a deeply nested provider hierarchy:

```
LoadingRegistryProvider
  └── FormPrefetcher (prefetches layouts, settings, payment)
      └── LayoutsProvider (layouts, hiddenLayoutsExpressions, expandedWidth)
          └── CodeListsProvider (static options from optionsId references)
              └── DataModelsProvider (complex - see below)
                  └── LayoutSettingsProvider (page order, groups, settings)
                      └── PageNavigationProvider
                          └── FormDataWriteProvider (zustand store for form data)
                              └── ValidationProvider (schema, backend, expression validations)
                                  └── NodesProvider (component tree)
                                      └── PaymentProviders (conditional)
```

### DataModelsProvider Complexity

This is the most complex provider (`src/App/frontend/src/features/datamodel/DataModelsProvider.tsx`). It:

1. Waits for layouts to load
2. Scans all layouts for `dataModelBindings` to find referenced data types
3. Validates each data type exists in applicationMetadata and has a `classRef`
4. For each referenced data type:
   - Loads initial form data from backend
   - Loads JSON schema for the data model
   - Loads expression validation config (for writable types only)
5. Determines which data types are writable vs readonly (based on `locked` status in instance.data)
6. Maps data types to data element IDs (from instance.data)

### Backend Current Endpoints

| Endpoint                                            | Data                         | Controller          |
| --------------------------------------------------- | ---------------------------- | ------------------- |
| `GET /{org}/{app}/api/layouts/{layoutSetId}`        | Form layouts                 | ResourceController  |
| `GET /{org}/{app}/api/layoutsettings/{layoutSetId}` | Layout settings              | ResourceController  |
| `GET /{org}/{app}/api/jsonschema/{dataType}`        | Data model schema            | ResourceController  |
| `GET /{org}/{app}/api/validationconfig/{dataType}`  | Expression validation config | ResourceController  |
| `GET /{org}/{app}/api/options/{optionsId}`          | Static options/code lists    | OptionsController   |
| `GET /{org}/{app}/instances/{id}/data/{elementId}`  | Form data                    | DataController      |
| `GET /{org}/{app}/instances/{id}/validate`          | Initial validations          | ValidateController  |
| `GET /{org}/{app}/instances/{id}`                   | Instance data                | InstancesController |
| `GET /{org}/{app}/instances/{id}/process`           | Process state                | ProcessController   |

### Existing Backend Infrastructure

The backend already has:

1. **Layout parsing** (`Models/Layout/`) - Full component tree parsing with:
   - `BaseComponent.DataModelBindings` - extracts data model references
   - `OptionsComponent` - knows about `optionsId`, `options`, `source`
   - `SubFormComponent` - knows about `layoutSetId` for nested forms
   - `ModelBinding` struct with `Field` and optional `DataType`

2. **BootstrapGlobalService** - consolidates global data (app metadata, layout sets, text resources, etc.)

3. **AppOptionsFileHandler** - reads static options from JSON files in the options folder

---

## Proposed Endpoints

### 1. Instance Form Bootstrap

```
GET /{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/bootstrap-form
```

Returns all data needed to render the form for the **current task**.

### 2. Stateless Form Bootstrap

```
GET /{org}/{app}/api/bootstrap-form/{layoutSetId}
```

Returns all data needed to render a stateless form.

---

## Response Structure (Draft)

```typescript
interface FormBootstrapResponse {
  // Layout data
  layouts: ILayoutCollection; // All layouts for the layout-set
  layoutSettings: ILayoutSettings; // Page order, groups, settings

  // Data models
  dataModels: {
    [dataType: string]: {
      schema: JSONSchema7; // JSON schema
      initialData: object; // Current form data
      dataElementId: string | null; // For instance mode
      isWritable: boolean; // Can this data model be modified?
      expressionValidationConfig?: IExpressionValidationConfig; // Only for writable
    };
  };

  // Initial validation results
  validationIssues?: BackendValidationIssue[];

  // Static options (see Options section below)
  staticOptions?: {
    [optionsId: string]: AppOption[];
  };
}
```

---

## Detailed Analysis

### Subforms

**How they work:**

- A `Subform` component in the layout references a `layoutSet` property
- Each subform entry is a separate data element in `instance.data` with the subform's default data type
- When navigating to a subform, `TaskOverrides` context provides:
  - `dataModelType` - the subform's data type
  - `dataModelElementId` - the specific data element ID
  - `layoutSetId` - the subform's layout set

**What the frontend currently does:**

1. Main form loads, sees a Subform component
2. When user adds/opens a subform entry, creates a new `FormProvider` with `TaskOverrides`
3. Subform's `FormProvider` loads its own layouts, data, schemas, etc.

**Bootstrap endpoint considerations:**

- Initial bootstrap should **NOT** include subform layout-sets or data
- Subform data elements are created dynamically when adding entries
- The endpoint needs a way to be called for a specific subform entry

**Subform endpoint support:**
The bootstrap endpoint should accept optional query parameters:

```
?layoutSetId={subformLayoutSetId}&dataElementId={specificDataElementId}
```

This allows the same endpoint to bootstrap a subform by overriding which layout-set and data element to load. The backend can:

1. Load the specified layoutSet's layouts
2. Load only the specified dataElementId's data
3. Return the appropriate response

---

### PDF Mode

**What differs in PDF mode:**

1. `useShouldValidateInitial()` returns `false` - skips initial validation fetch
2. Expression validation config is NOT loaded (see `DataModelsProvider.tsx:365`)
3. Schema is still loaded (needed for data model binding validation)
4. Form data is still loaded
5. Layouts are still loaded

**Specific skipped data:**

- `expressionValidationConfig` for all data types
- Initial backend validation call

**Cost analysis:**

- Expression validation configs are JSON files, typically small (<10KB)
- Initial validation is a server-side computation that can be expensive

**Recommendation:**
Add a `?pdf=true` query parameter to skip:

- Expression validation configs
- Initial validation execution

The cost of returning unused data is minimal for the configs, but skipping validation execution is beneficial for performance.

---

### Static Options / Code Lists

**How they currently work on the frontend:**

`CodeListsProvider.tsx` scans layouts for:

1. Components with `optionsId` and no `mapping` property (statically fetchable)
2. `optionLabel` expressions in any component property

**What makes options "static":**

- Must have an `optionsId` (not inline `options` or `source`)
- Must NOT have a `mapping` property (which depends on form data)
- `queryParameters` must be static values (strings/numbers/booleans), not expressions

**Backend capabilities:**

- `AppOptionsFileHandler` can read JSON files from the options folder
- `AppOptionsFactory.GetOptionsProvider()` returns the provider for an optionsId
- `DefaultAppOptionsProvider` (fallback) reads from JSON files

**What the backend should do:**

1. Parse the layouts to find all components with `optionsId`
2. Filter to those that are "statically fetchable":
   - No `mapping` property
   - No dynamic `queryParameters` (i.e., no expressions in values)
3. For each statically fetchable optionsId:
   - Check if a JSON file exists in the options folder → include it
   - Otherwise, check if a custom `IAppOptionsProvider` is registered
     - If it doesn't require instance context, could potentially include it
     - If it requires instance context (`IInstanceAppOptionsProvider`), skip it

4. Also scan for `optionLabel` expressions in the layout and include those optionsIds

**Note on caching:**
The frontend currently caches options forever when they're statically fetchable. By including them in the bootstrap response, we eliminate the separate request entirely.

---

### Initial Validation

**Current behavior:**

- `useBackendValidationQuery` fetches from `GET /{org}/{app}/instances/{id}/validate`
- `useShouldValidateInitial()` returns `false` for: custom receipt, PDF mode, stateless, no writable data types

**Can it be bundled?**
Yes. The validation endpoint already exists and can be called server-side as part of the bootstrap. The validation result can be included in the response.

**Considerations:**

- Validation can be expensive for complex apps
- For stateless mode, there's no instance to validate against
- For PDF mode, validation is skipped entirely

**Recommendation:**

- Include in instance bootstrap (not stateless)
- Skip when `?pdf=true` is passed
- Consider making it optional via `?includeValidation=true` for backwards compatibility

---

## Implementation Considerations

### Data Types Discovery

The backend needs to:

1. Parse the layouts for the current layout-set
2. Extract all `dataModelBindings` from all components
3. Collect unique data types (explicit or default)
4. Validate each data type exists in applicationMetadata with a `classRef`
5. For instance mode: find the corresponding data element in `instance.data`

**Existing infrastructure:**

- `LayoutModel` and component parsing already exists
- `BaseComponent.DataModelBindings` extracts bindings
- `ModelBinding` has optional `DataType` property

### Authorization

The endpoint must respect existing authorization:

- Instance endpoint requires instance read permission
- Stateless endpoint may allow anonymous (depends on app configuration)

### Caching Considerations

**What can be cached:**

- Layouts (until app deployment)
- Layout settings (until app deployment)
- JSON schemas (until app deployment)
- Expression validation configs (until app deployment)
- Static options from JSON files (until app deployment)

**What cannot be cached:**

- Form data (changes per save)
- Data element IDs (changes per instance)
- Writable status (can change if element is locked)
- Initial validation (depends on current data)

**Recommendation:**
The endpoint should not be cached at the HTTP level (form data changes), but the backend can internally cache the static portions.

### Error Handling

The endpoint should return partial success where possible:

- If one data model fails to load, include error for that model but return others
- If one options file is missing, log warning but continue

### Performance

**Parallelization opportunities:**

- All data model fetches can run in parallel
- All schema reads can run in parallel
- All options file reads can run in parallel
- Validation can run after data is loaded

**Backend implementation pattern:**

```csharp
await Task.WhenAll(
    LoadLayoutsAsync(),
    LoadLayoutSettingsAsync(),
    LoadSchemasAsync(dataTypes),
    LoadFormDataAsync(dataElements),
    LoadExpressionValidationConfigsAsync(writableTypes),
    LoadStaticOptionsAsync(optionIds)
);
var validationIssues = await RunValidationAsync();
```

---

## Scope Summary

### In Scope

| Data                          | Instance | Stateless | Notes                            |
| ----------------------------- | -------- | --------- | -------------------------------- |
| Layouts                       | ✓        | ✓         | Current layout-set only          |
| Layout settings               | ✓        | ✓         | Current layout-set only          |
| Data model schemas            | ✓        | ✓         | All referenced types             |
| Initial form data             | ✓        | ✓         | All referenced data elements     |
| Expression validation configs | ✓        | ✓         | Writable types only, skip in PDF |
| Data element metadata         | ✓        | N/A       | IDs, writable status             |
| Static options                | ✓        | ✓         | JSON files + static providers    |
| Initial validation            | ✓        | ✗         | Skip in PDF mode                 |

### Out of Scope

| Data                  | Reason                                       |
| --------------------- | -------------------------------------------- |
| Instance/process data | Different lifecycle, loaded before form      |
| Subform layout-sets   | Loaded on-demand when opening subform        |
| Subform data          | Created dynamically, loaded via query params |
| Dynamic options       | Depend on form data (mapping property)       |
| Payment information   | Conditional, separate flow                   |
| PDF format config     | Only needed in PDF mode, separate endpoint   |

---

## Pitfalls and Warnings

### 1. Data Staleness

If the user has the form open and data changes server-side (e.g., another user edits), the initial data will be stale. This is the same as current behavior but worth noting.

### 2. Subform Data Element Creation

Subform entries are created when the user clicks "Add". The bootstrap endpoint cannot know which subform entries will be added. The frontend must still call the endpoint when navigating to a new subform entry.

### 3. Options with Query Parameters

Components can have `queryParameters` that are expressions referencing form data. These cannot be resolved at bootstrap time. The frontend must still fetch these options separately after form data is loaded.

### 4. Large Response Size

For complex forms with many data types and options, the response could be large. Consider:

- Compression (gzip/brotli)
- Streaming response
- Optional fields to reduce payload

### 5. Backwards Compatibility

Old frontends won't know about this endpoint. The separate endpoints must continue to work.

### 6. Expression Validation Config Format

The frontend transforms the config via `resolveExpressionValidationConfig()`. The backend should return the raw format, letting the frontend transform as needed.

---

## Next Steps

1. **Design API contract** - Finalize request/response schemas
2. **Implement shared service** - Reusable between instance and stateless endpoints
3. **Add layout parsing utilities** - Extract data types and option references from layouts
4. **Create endpoints** - Instance and stateless variants
5. **Update frontend** - New provider that uses bootstrap endpoint
6. **Add tests** - Integration tests for both endpoints
7. **Performance benchmarking** - Compare old vs new approach
