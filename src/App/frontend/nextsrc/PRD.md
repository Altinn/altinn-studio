# PRD: App Frontend Refactor (`src/` → `nextsrc/`)

**Status:** In Progress
**Target:** June 30, 2026
**Last Updated:** 2026-02-16

---

## 1. Overview

This document tracks the full rewrite of the Altinn 3 app frontend from the legacy codebase (`src/`) to a modern architecture (`nextsrc/`). The goal is to replace the entire `src/` codebase with a simpler, faster, and more maintainable application while preserving all existing functionality.

During migration, `nextsrc/` can import and use individual components from `src/` to enable incremental delivery. Layout components will be ported incrementally — starting with the most critical ones and expanding over time.

## 2. Goals

| Goal | Description |
|------|-------------|
| **Simplify state management** | Replace the deeply nested provider tree (11+ levels in FormProvider alone) and mixed Zustand/Context/Query patterns with a clear, minimal approach centered on React Query and a custom FormClient pub-sub store. |
| **Better routing & data loading** | Use React Router v6 data loaders to fetch data before rendering, eliminating loading waterfalls and simplifying the entrypoint/instantiation flow. |
| **Performance** | Reduce unnecessary re-renders caused by context propagation. Use `useSyncExternalStore` for fine-grained subscriptions. Eliminate the monolithic NodesContext store. |
| **Developer experience** | Make the codebase easier to understand, test, and contribute to. Flatten the provider hierarchy. Enable component testing without wiring up the entire app context. |

## 3. Non-Goals

- Build tooling migration (Webpack→Vite, Jest→Vitest, Cypress→Playwright) — tracked separately.
- Backend API changes — the new frontend consumes the same APIs.
- Design system changes — continue using `@digdir/designsystemet-react`.

## 4. Architecture Decisions

### 4.1 State Management

| Concern | Old (`src/`) | New (`nextsrc/`) |
|---------|-------------|-------------------|
| Server state | Mixed: React Query, Zustand stores, Context | React Query (TanStack Query) |
| Form data | Zustand store (`FormDataWrite`, 1131 lines) with state machine | `FormClient` pub-sub class with `useSyncExternalStore` |
| Layout/component tree | `NodesContext` Zustand store (477 lines) with plugin system | `FormClient.setLayoutCollection()` + `moveChildren` + `resolveBindings` transforms at load time |
| Validation | Zustand store merging 4 sources | TBD — likely React Query + FormClient |
| UI state | Various Zustand contexts | TBD — local component state or minimal Zustand |

### 4.2 Routing & Data Loading

| Concern | Old (`src/`) | New (`nextsrc/`) |
|---------|-------------|-------------------|
| Route definitions | React Router with Context-based data fetching | React Router v6 with `loader` functions |
| Data fetching | `useEffect` + Context providers + prefetchers | Loaders run before render; no loading spinners for initial data |
| Entry point routing | `src/features/entrypoint/` with Context | `entryRedirectLoader` with `redirect()` |
| Type-safe URLs | Manual string building | `routesBuilder.ts` with typed route params |

### 4.3 Component Architecture

| Concern | Old (`src/`) | New (`nextsrc/`) |
|---------|-------------|-------------------|
| Component rendering | NodesContext generates tree, components pull from Zustand | `FormEngine` renders from pre-transformed layout tree |
| Data binding | Complex generator + context selectors | `resolveBindings()` at load time, `useFormValue(path)` at render |
| Repeating groups | Generator expands rows, NodesContext tracks state | `resolveBindings()` creates row-indexed copies; FormClient manages data |

### 4.4 API Layer

Static class-based API clients in `core/apiClient/`:
- `InstanceApi` — instance CRUD
- `DataApi` — form data
- `LayoutApi` — layouts and settings
- `PartiesApi` — party/user data

## 5. Feature Migration Tracker

### Legend

| Status | Meaning |
|--------|---------|
| Done | Fully implemented in nextsrc |
| Partial | Started, core functionality works, gaps remain |
| Not Started | No code in nextsrc yet |

---

### 5.1 Core Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| React Router setup | Done | `router.tsx`, `routesBuilder.ts` |
| TanStack Query client | Done | `QueryClient.ts` (minimal config) |
| Axios instance | Done | `core/axiosInstance.ts` |
| Global data accessor | Done | `core/globalData.ts` (window object) |
| Error handling (router) | Done | `core/routerErrorResolver.ts` |
| Type guards | Done | `core/typeguards.ts` |
| HTTP status codes | Done | `core/serverStatusCodes.ts` |

### 5.2 Instantiation & Entry Flow

| Feature | Status | Notes |
|---------|--------|-------|
| Entry redirect loader | Partial | `entryRedirectLoader.ts` — handles new-instance, select-instance; anonymous handling TBD |
| Instance creation | Done | `InstanceSelectionPage` with mutation |
| Instance page (redirect to task) | Done | `instanceLoader.ts` |
| Party selection | Partial | `PartySelectionPage.tsx` exists as placeholder; party state management TBD |
| Stateless app redirect | Not Started | Needs layout/formdata loading for stateless path |
| Anonymous user handling | Not Started | Mentioned in intention.md as TODO |

### 5.3 Form Engine & Data

| Feature | Status | Notes |
|---------|--------|-------|
| FormClient (pub-sub store) | Done | `libs/form-client/form-client.ts` |
| FormClient React hooks | Done | `useFormValue`, `useFormData`, `useLayout` |
| Layout tree transformation (`moveChildren`) | Done | `libs/form-client/moveChildren.ts` |
| Data binding resolution (`resolveBindings`) | Done | `libs/form-client/resolveBindings.ts` — supports repeating groups |
| Page loader (data fetching) | Done | `features/form/pages/page/pageLoader.tsx` |
| Task loader (redirect to first page) | Done | `features/form/pages/task/taskLoader.ts` |
| FormEngine component renderer | Partial | Renders from component map; only Input + RepeatingGroup implemented |
| Form data save/autosave | Not Started | Old: complex state machine in FormDataWrite (1131 lines) |
| JSON Patch generation | Not Started | Old: `src/features/formData/jsonPatch/` |
| Multi-data-model support | Not Started | Old: handles multiple data models per form |

### 5.4 Validation

| Feature | Status | Notes |
|---------|--------|-------|
| Backend validation | Not Started | Old: fetched from API, merged in ValidationContext |
| Schema validation (AJV) | Not Started | Old: JSON schema validation via ajv |
| Expression-based validation | Not Started | Old: evaluated from layout expressions |
| Invalid data validation | Not Started | Old: catches type mismatches |
| Validation display on components | Not Started | Old: wired through NodesContext |
| "Show all errors" behavior | Not Started | Old: triggered on attempted submit |

### 5.5 Layout Components

| Component | Status | Priority | Notes |
|-----------|--------|----------|-------|
| Input | Partial | High | Basic implementation in FormEngine |
| RepeatingGroup | Partial | High | Basic nested rendering works |
| TextArea | Not Started | High | |
| Dropdown | Not Started | High | |
| Checkboxes | Not Started | High | |
| RadioButtons | Not Started | High | |
| Datepicker | Not Started | High | |
| Button / ActionButton | Not Started | High | |
| NavigationButtons | Not Started | High | |
| FileUpload / FileUploadWithTag | Not Started | High | |
| Header / Paragraph / Text | Not Started | Medium | Display-only |
| Alert | Not Started | Medium | |
| Panel | Not Started | Medium | |
| Group | Not Started | Medium | |
| Grid | Not Started | Medium | |
| Accordion / AccordionGroup | Not Started | Medium | |
| Address | Not Started | Medium | |
| Likert | Not Started | Medium | |
| Summary / Summary2 | Not Started | Medium | |
| NavigationBar | Not Started | Medium | |
| Number | Not Started | Medium | |
| MultipleSelect | Not Started | Medium | |
| Image / Audio / Video | Not Started | Low | |
| Map | Not Started | Low | |
| IFrame | Not Started | Low | |
| Custom | Not Started | Low | |
| Tabs | Not Started | Low | |
| Cards | Not Started | Low | |
| Payment / PaymentDetails | Not Started | Low | |
| Subform | Not Started | Low | |
| PersonLookup / OrganisationLookup | Not Started | Low | |
| List / SimpleTable | Not Started | Low | |
| Link / Divider | Not Started | Low | |
| PrintButton / PDFPreviewButton | Not Started | Low | |
| InstantiationButton | Not Started | Low | |
| InstanceInformation | Not Started | Low | |
| SigneeList / SigningActions / SigningDocumentList | Not Started | Low | |
| AddToList | Not Started | Low | |
| AttachmentList | Not Started | Low | |
| Dropzone (app-component) | Not Started | Low | |

> **Note:** During migration, components not yet ported can be imported from `src/` and wrapped for use in `nextsrc/`.

### 5.6 Expression Engine

| Feature | Status | Notes |
|---------|--------|-------|
| Expression evaluation | Not Started | Old: `src/features/expressions/` — evaluates dynamic show/hide, required, read-only |
| Expression validation | Not Started | Old: expressions can define validation rules |

### 5.7 Process & Workflow

| Feature | Status | Notes |
|---------|--------|-------|
| Process state management | Not Started | Old: `src/features/process/` |
| Task navigation | Partial | Task loader redirects to first page |
| Process actions (confirm, reject, sign) | Not Started | Old: various action components |

### 5.8 Language & i18n

| Feature | Status | Notes |
|---------|--------|-------|
| Text resource loading | Not Started | Old: `src/features/language/` |
| Text resource resolution | Not Started | Old: variable substitution, markdown |
| Language switching | Not Started | |

### 5.9 Options / Code Lists

| Feature | Status | Notes |
|---------|--------|-------|
| Static options | Not Started | Old: `src/features/options/` |
| Dynamic options (API) | Not Started | Old: fetched from backend |
| Code list caching | Not Started | Old: CodeListsProvider |

### 5.10 Attachments & Files

| Feature | Status | Notes |
|---------|--------|-------|
| File upload | Not Started | Old: `src/features/attachments/` |
| File upload with tag | Not Started | |
| Attachment list display | Not Started | |

### 5.11 Navigation

| Feature | Status | Notes |
|---------|--------|-------|
| Page navigation | Partial | Route-based via React Router |
| Navigation order (layoutSettings) | Not Started | Old: `src/features/form/layoutSettings/` |
| Alert on unsaved changes | Not Started | Old: `src/features/alertOnChange/` |
| Navigation bar component | Not Started | |

### 5.12 PDF / Receipt / Payment

| Feature | Status | Notes |
|---------|--------|-------|
| PDF generation | Not Started | Old: `src/features/pdf/` |
| Receipt display | Not Started | Old: `src/features/receipt/` |
| Payment flow | Not Started | Old: `src/features/payment/` |

### 5.13 Other Features

| Feature | Status | Notes |
|---------|--------|-------|
| Application metadata | Not Started | Old: `src/features/applicationMetadata/` |
| Application settings | Not Started | Old: `src/features/applicationSettings/` |
| User profile | Not Started | Old: `src/features/profile/` |
| Data lists | Not Started | Old: `src/features/dataLists/` |
| Data model binding | Not Started | Old: `src/features/datamodel/` |
| External API integration | Not Started | Old: `src/features/externalApi/` |
| Subform data handling | Not Started | Old: `src/features/subformData/` |
| DevTools | Not Started | Old: `src/features/devtools/` |
| Footer | Not Started | Old: `src/features/footer/` |
| Display data | Not Started | Old: `src/features/displayData/` |

## 6. Migration Strategy

### Phase 1: Foundation (Current)
Get the core loop working end-to-end:
- Entry flow → instance creation → task → page → form rendering → data save
- Core components: Input, RepeatingGroup
- FormClient store with read/write

### Phase 2: Core Form Features
Make basic forms fully functional:
- Form data save/autosave with JSON Patch
- Validation (schema + backend)
- High-priority layout components (TextArea, Dropdown, Checkboxes, RadioButtons, Datepicker, Buttons, FileUpload)
- Language/i18n support
- Options/code lists
- Navigation (page order, navigation buttons)

### Phase 3: Advanced Features
Handle complex scenarios:
- Expression engine (show/hide, required, read-only)
- Expression-based validation
- Multi-data-model support
- Repeating groups with full CRUD
- Process actions (confirm, reject, sign)
- Attachments

### Phase 4: Completeness
Port remaining features and components:
- All medium/low priority layout components
- PDF generation
- Receipt
- Payment flow
- Subforms
- DevTools
- All remaining `src/features/` modules

### Phase 5: Cutover
- Remove `src/` imports from `nextsrc/`
- Delete `src/` codebase
- Update build configuration

## 7. Risks & Open Questions

| Item | Description |
|------|-------------|
| **Component volume** | 72+ layout components is a large surface area. Wrapping old components may introduce coupling that's hard to remove later. |
| **Expression engine complexity** | The expression evaluation system is deeply integrated. Porting it cleanly is critical. |
| **FormDataWrite complexity** | The old form save state machine (1131 lines) handles debouncing, autosave, optimistic updates, and save coordination. Replicating this behavior correctly is high-risk. |
| **Validation coordination** | 4 validation sources that must merge and display correctly. Timing and ordering matters. |
| **NodesContext replacement** | The old system generates a full component tree with state. The new approach (pre-transformed layouts + FormClient) is fundamentally different. Edge cases in repeating groups, conditional rendering, and dynamic layouts need careful testing. |
| **Party state management** | Noted in intention.md as an open question — how to hold selected party state. |
| **Anonymous user flow** | Not yet implemented; needs design. |
| **API compatibility** | New code must work with the same backend APIs. No room for breaking changes. |
