# Form Bootstrap Implementation Plans

## Overview

This document outlines a phased approach to dramatically simplify the frontend by moving form data loading to the backend.

**Goal**: Replace the complex frontend waterfall of 10+ nested providers with a single backend endpoint and simple frontend provider. Delete as much frontend code as possible.

**Related**: See [form-bootstrap-endpoint.md](../form-bootstrap-endpoint.md) for the research document.

---

## What We're Deleting

This refactor is about removing complexity. Here's what goes away:

| File/Component                | Lines | Why It's Gone                          |
| ----------------------------- | ----- | -------------------------------------- |
| `DataModelsProvider.tsx`      | ~430  | Replaced by bootstrap response         |
| `CodeListsProvider.tsx`       | ~225  | Replaced by bootstrap response         |
| `FormPrefetcher.ts`           | ~40   | No longer needed                       |
| `useDataModelSchemaQuery.ts`  | -     | Schema comes from bootstrap            |
| `useFormDataQuery.ts`         | -     | Initial data comes from bootstrap      |
| `useCustomValidationQuery.ts` | -     | Validation config comes from bootstrap |
| Multiple zustand stores       | -     | No more incremental state building     |

**Estimated frontend code removal: 800+ lines**

---

## Phase Summary

| Phase                            | Name              | Description                            |
| -------------------------------- | ----------------- | -------------------------------------- |
| [1](./01-core-service.md)        | Backend Service   | Core service with layout analysis      |
| [1.1](./01.1-parity-addendum.md) | Parity Addendum   | Contract, compatibility, risk controls |
| [2](./02-endpoints.md)           | Backend Endpoints | Instance and stateless endpoints       |
| [3](./03-frontend-provider.md)   | Frontend Provider | New simple provider, delete old code   |
| [4](./04-subform-support.md)     | Subform Support   | Query params for subforms              |
| [5](./05-testing.md)             | Testing           | E2E tests to verify everything works   |

---

## Architecture: Before vs After

### Before (Current State)

```
LoadingRegistryProvider
  └── FormPrefetcher (fires off prefetch requests)
      └── LayoutsProvider (waits for layouts, creates context)
          └── CodeListsProvider (zustand store, scans layouts, fetches options)
              └── DataModelsProvider (zustand store, scans layouts,
                  │                   fetches schemas, data, validation configs)
                  └── LayoutSettingsProvider (waits for settings)
                      └── PageNavigationProvider
                          └── FormDataWriteProvider (zustand store)
                              └── ValidationProvider
                                  └── NodesProvider
                                      └── PaymentProviders
```

**Problems:**

- 10+ nested providers creating waterfall of requests
- Zustand stores wrapped in contexts to avoid rerenders
- Complex incremental state building
- Each provider waits for previous to complete
- Lots of code doing simple data fetching

### After (New State)

```
FormProvider
  └── FormBootstrapProvider (single fetch, provides all data)
      └── FormDataWriteProvider (for mutations only)
          └── ValidationProvider (uses bootstrap data)
              └── NodesProvider
                  └── PageNavigationProvider
                      └── PaymentProviders
```

**Benefits:**

- Single request gets all form data
- No zustand stores for read-only data
- No layout scanning on frontend
- Drastically simpler provider tree
- ~800 lines of frontend code deleted

---

## Response Structure

```typescript
interface FormBootstrapResponse {
  // Layouts (processed, ready to use)
  layouts: ILayouts;
  layoutSettings: ProcessedLayoutSettings;

  // Data models (keyed by data type)
  dataModels: {
    [dataType: string]: {
      schema: JSONSchema7;
      initialData: object;
      dataElementId: string | null; // null for stateless
      isWritable: boolean;
      expressionValidationConfig: IExpressionValidations | null; // null for PDF
    };
  };

  // Static options (keyed by optionsId)
  staticOptions: {
    [optionsId: string]: AppOption[];
  };

  // Initial validation (instance mode only, not PDF)
  validationIssues?: ValidationIssueWithSource[];

  // Metadata
  metadata: {
    layoutSetId: string;
    defaultDataType: string;
    isSubform: boolean;
    isPdf: boolean;
  };
}
```

---

## Endpoint URLs

### Instance Mode

```
GET /{org}/{app}/instances/{partyId}/{guid}/bootstrap-form
    ?layoutSetId={subformLayoutSet}     // For subforms
    &dataElementId={dataElementId}       // For subforms
    &pdf=true                            // Skip validation
    &language=nb
```

### Stateless Mode

```
GET /{org}/{app}/api/bootstrap-form/{layoutSetId}
    ?language=nb
```

---

## File Locations

### Backend (New Files)

```
src/Altinn.App.Core/Features/Bootstrap/
├── IFormBootstrapService.cs
├── FormBootstrapService.cs
├── ILayoutAnalysisService.cs
├── LayoutAnalysisService.cs
└── Models/
    ├── FormBootstrapResponse.cs
    └── DataModelInfo.cs

src/Altinn.App.Api/Controllers/
└── FormBootstrapController.cs
```

### Frontend (Changes)

```
src/features/formBootstrap/           # NEW
├── types.ts                          # Response types
├── useFormBootstrapQuery.ts          # Single query hook
└── FormBootstrapProvider.tsx         # Provides bootstrap data

src/features/form/FormContext.tsx     # MODIFIED - simplified
src/features/datamodel/               # DELETE most files
src/features/options/CodeListsProvider.tsx  # DELETE
src/queries/formPrefetcher.ts         # DELETE
```

---

## Migration Strategy

This is a breaking change. No feature flags, no gradual rollout.

### Phase 1-2: Backend Only

- Implement and test backend endpoints
- Frontend continues to work with old approach
- Can manually test new endpoints
- Implement the [parity addendum](./01.1-parity-addendum.md) before deleting frontend providers

### Phase 3: Frontend Swap

- Replace `FormContext.tsx` provider hierarchy
- Delete old providers and queries
- Update any code that directly used deleted hooks

### Phase 4: Subforms

- Add query parameter support
- Update `SubformWrapper.tsx`

### Phase 5: Testing

- Run full E2E test suite
- Fix any regressions
- Done

---

## What Stays

These providers remain because they handle mutations or real-time state:

- **FormDataWriteProvider**: Handles form data mutations (PATCH)
- **ValidationProvider**: Handles validation state after mutations
- **NodesProvider**: Component tree and node state
- **PageNavigationProvider**: Current page state
- **PaymentProviders**: Payment flow (separate concern)

---

## Dependencies Between Phases

```
Phase 1 (Backend Service)
    │
    └──► Phase 1.1 (Parity Addendum)
              │
              └──► Phase 2 (Endpoints)
                        │
                        └──► Phase 3 (Frontend Provider)
                                  │
                                  └──► Phase 4 (Subform Support)
                                            │
                                            └──► Phase 5 (Testing)
```

Each phase must be completed before the next begins.

---

## Quick Start

1. Read the [research document](../form-bootstrap-endpoint.md) for context
2. Implement [Phase 1](./01-core-service.md) - Backend Service
3. Implement [Phase 1.1](./01.1-parity-addendum.md) - Parity and contract requirements
4. Implement [Phase 2](./02-endpoints.md) - Endpoints
5. Implement [Phase 3](./03-frontend-provider.md) - Frontend (the big one)
6. Implement [Phase 4](./04-subform-support.md) - Subforms
7. Run [Phase 5](./05-testing.md) - E2E + contract/perf verification
