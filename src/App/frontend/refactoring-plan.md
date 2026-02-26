# Altinn App Frontend Migration Plan: `src/` → `nextsrc/`

## Validation Strategy: Cypress Tests as Source of Truth

The existing Cypress test suite in `test/e2e/` is the **source of truth** for validating the migration. The `nextsrc/` code must pass all existing Cypress tests before it can replace `src/`. These tests cover:

- **93 integration spec files** across 12 test feature areas (+ 1 manual spec)
- **42 frontend-test specs**: full workflows (instantiation, navigation, auto-save, validation, groups, attachments, PDF, process steps, receipt, language, options, dynamics, formatting, party-selection, etc.)
- **25 component-library specs**: individual component behavior (input, dropdown, checkboxes, radio buttons, date picker, address, file upload, image upload, grid, list, repeating group, person/org lookup, etc.)
- **5 stateless app specs**: stateless forms, receipts, party selection, feedback, instantiate-from-query-params
- **4 subform specs**: subform containers, attachments in subforms, PDF with subforms, table edit button
- **4 multiple-datamodels specs**: fetching, saving, readonly, validation across data models
- **4 anonymous stateless specs**: anonymous access, auto-save, options, validation
- **2 expression-validation specs**: dynamic validation expressions
- **2 signing specs**: multi-signer workflows, rejection
- **1 payment spec**, **1 service-task spec**, **1 navigation-subform spec**, **1 user-managed signing spec**

### Running Cypress tests

**Prerequisites**: Local docker environment must be running (`local.altinn.cloud` accessible).

```bash
# Run a single spec headlessly
npx cypress run --env environment=docker --spec "test/e2e/integration/component-library/input.ts" --headless --browser chrome

# Run all component-library specs headlessly
npx cypress run --env environment=docker --spec "test/e2e/integration/component-library/**/*.ts" --headless --browser chrome

# Run a specific feature test
npx cypress run --env environment=docker --spec "test/e2e/integration/frontend-test/validation.ts" --headless --browser chrome

# Run all tests headlessly
npx cypress run --env environment=docker --headless --browser chrome

# Open Cypress interactively (for debugging)
npx cypress open --env environment=docker
```

### How to use the tests during migration

1. **Each phase completion** should be validated by running the relevant subset of Cypress tests
2. **Phase-to-test mapping** is provided in each phase section below
3. Tests may need minor updates to point at `nextsrc/` routes/selectors, but the **test logic and assertions must not change** -- they define correct behavior
4. The custom Cypress commands in `test/e2e/support/custom.ts` (800+ lines) encode critical interaction patterns (waitUntilSaved, navPage, addItemToGroup, moveProcessNext, etc.) that the new code must support
5. Page objects in `test/e2e/pageobjects/app-frontend.ts` define the expected DOM structure and selectors

### Test infrastructure to preserve
- **Support files**: `test/e2e/support/` (custom commands, auth, form fillers, navigation helpers)
- **Page objects**: `test/e2e/pageobjects/` (DOM selectors and app references)
- **Fixtures**: `test/e2e/fixtures/` (test PDFs, images, text resources)
- **Config**: `test/e2e/config/` (docker, podman, tt02 environments)
- **Plugins**: cypress-axe (a11y), @percy/cypress (visual regression), @testing-library/cypress, cypress-network-idle

---

## Progress Tracker

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 0.1 | Move FormEngine to `libs/form-engine` | Done | |
| 0.2 | Define change notification API on FormClient | Done | |
| 0.3 | Error boundaries and error handling | Done | |
| 0.4 | Loading states | Deferred | Nice-to-have, not blocking |
| 0.5 | Auth and session keep-alive | Deferred | Not blocking main lifecycle |
| 0.6 | Migrate options fetching to TanStack Query | Deferred | Not blocking main lifecycle |
| 1.1 | App shell persistence layer | Done | |
| 1.2 | Dirty tracking and unsaved changes warning | Not started | |
| 1.3 | Stateless form data | Not started | |
| 2.1 | Backend validation integration | Not started | |
| 2.2 | Schema validation (client-side) | Partial | Schema loading + type coercion done; validation display pending |
| 2.3 | Expression-based validation | Not started | |
| 2.4 | Validation display and visibility | Not started | |
| 2.5 | Required field validation | Not started | |
| 3.1 | Page navigation within a task | Not started | |
| 3.2 | Layout settings integration | Not started | |
| 3.3 | Process management | Not started | |
| 3.4 | Confirmation and receipt pages | Not started | |
| 4.1 | Text/date components | Not started | |
| 4.2 | File handling components | Not started | |
| 4.3 | Lookup components | Not started | |
| 4.4 | Container/layout components | Not started | |
| 4.5 | Media components | Not started | |
| 4.6 | Action components | Not started | |
| 5.1 | Summary components | Not started | |
| 5.2 | Advanced expression functions | Not started | |
| 5.3 | Multiple data models | Not started | |
| 5.4 | Options with mapping and source | Not started | |
| 5.5 | Language switching | Not started | |
| 6.1 | Payment flow | Not started | |
| 6.2 | Signing workflow | Not started | |
| 6.3 | PDF generation | Not started | |
| 6.4 | Subforms | Not started | |
| 7.1 | Remaining components | Not started | |
| 7.2 | DevTools | Not started | |
| 7.3 | External API integration | Not started | |
| 7.4 | Performance optimization | Not started | |
| 7.5 | Accessibility audit | Not started | |

---

## Architecture Principle

**The form library (`libs/form-client` + `libs/form-engine`) is reusable and app-agnostic.** It manages in-memory form state, renders components, evaluates expressions, and notifies the consuming app of changes via callbacks/events. It does NOT handle persistence, API calls, or app-specific concerns.

**The app shell (`nextsrc/` outside `libs/`) is responsible for:**
- Fetching/saving data (API clients, TanStack Query)
- Routing and navigation
- Auth/session management
- Process workflow
- Wiring the form library into the app via providers and event handlers

This separation means the form library can be used in other apps (e.g., Altinn Studio preview, other frontends) without modification.

```
┌─────────────────────────────────────────────────────┐
│  App Shell (nextsrc/)                               │
│  - Routing, API clients, auth, process management   │
│  - Listens to form library change events            │
│  - Calls save/validate APIs in response             │
│  - Feeds fetched data into form library             │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  libs/form-client                             │  │
│  │  - In-memory stores (formData, textResources, │  │
│  │    validation)                                 │  │
│  │  - Expression evaluation                      │  │
│  │  - Binding resolution                         │  │
│  │  - Change notification callbacks              │  │
│  │  - NO persistence, NO API calls               │  │
│  ├───────────────────────────────────────────────┤  │
│  │  libs/form-engine                             │  │
│  │  - FormEngine component renderer              │  │
│  │  - All form components (Input, Dropdown, etc) │  │
│  │  - Component registry                         │  │
│  │  - React hooks for form-client integration    │  │
│  │  - NO persistence, NO API calls               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Current State Summary

### What `nextsrc/` has today
- **FormClient library** with 3 Zustand stores (formData, textResources, validation)
- **23 form components**: Input, TextArea, Number, Datepicker, Dropdown, RadioButtons, Checkboxes, MultipleSelect, RepeatingGroup, Group, Header, Paragraph, Image, Divider, Link, Alert, Button, ButtonGroup, Panel, Accordion, AccordionGroup, NavigationBar
- **Basic expression evaluator**: equals, notEquals, not, and, or, if, dataModel, instanceContext, frontendSettings
- **API clients**: dataApi, instanceApi, layoutApi, partiesApi
- **App layout**: header (with profile menu, org logo), footer (contact info)
- **Router with loaders** for pages and tasks
- **Instantiation flow**: entry redirect, party selection (complete with tests), instance selection, instance page, stateless page (placeholder)
- **React hooks**: useFormValue, useBoundValue, useGroupArray, useTextResource, useFieldValidations, useLayout, useLanguage
- **Utilities**: useDeviceWidths, binding resolution, moveChildren layout transformation

### What's missing (from `src/`)
- ~41 layout components
- Form data persistence in app shell (auto-save, debouncing, JSON patches)
- Advanced validation (backend, schema, expression-based, 4-source merging)
- Data model management (schema loading, multiple data types)
- Options/code lists proper fetching and caching
- Attachments/file upload system
- Payment processing flow
- PDF generation and viewing
- Page navigation with validation triggers
- Process workflow management
- Receipt/completion flow
- Advanced expression functions
- Language switching
- Auth/keep-alive (JWT refresh)
- Subforms, signing, devtools, error boundaries, loading states

---

## Phase 0: Restructure and Foundation Hardening

**Goal**: Establish the libs separation and make the foundation robust.

### 0.1 - Move FormEngine to `libs/form-engine`
- Move `nextsrc/features/form/FormEngine/` → `nextsrc/libs/form-engine/`
- Move `nextsrc/features/form/components/` → `nextsrc/libs/form-engine/components/`
- Move React hooks from `nextsrc/libs/form-client/react/` → `nextsrc/libs/form-engine/hooks/` (or keep shared hooks in form-client, component-specific hooks in form-engine)
- Ensure form-engine depends on form-client but NOT on app shell code (no imports from `core/apiClient/`, `features/instantiate/`, etc.)
- **Files**: restructure `nextsrc/libs/` directory

### 0.2 - Define change notification API on FormClient
- Add an event/callback system to `FormClient` so the app shell can listen for changes
- Examples: `onFormDataChange(callback)`, `onValidationRequest(callback)`, `onNavigationRequest(callback)`
- The form library emits events; the app shell decides what to do (save, validate, navigate)
- The app shell feeds results back via `formClient.setFormData()`, `formClient.setValidations()`, etc.
- **Files**: `nextsrc/libs/form-client/form-client.ts`

### 0.3 - Error boundaries and error handling
- Add root `ErrorBoundary` wrapping the router
- Add error boundaries around individual form components in `FormEngine` (one broken component shouldn't crash the page)
- Standardize error handling in API clients -- consistent error types, retry logic via TanStack Query
- **Files**: `nextsrc/index.tsx`, `nextsrc/libs/form-engine/FormEngine.tsx`, `nextsrc/core/apiClient/*.ts`

### 0.4 - Loading states
- Add loading indicators to route transitions (React Router `useNavigation`)
- Add skeleton/spinner states in `FormEngine` while layout data loads
- **Files**: `nextsrc/libs/form-engine/FormEngine.tsx`, `nextsrc/features/form/pages/page/page.tsx`

### 0.5 - Auth and session keep-alive
- Implement JWT refresh polling (old codebase calls `refreshJwtTokenUrl` periodically)
- Add 401/403 interceptor on axios instance
- **Reference**: `src/core/auth/KeepAliveProvider.tsx`
- **Files**: `nextsrc/core/axiosInstance.ts`, new `nextsrc/core/auth/keepAlive.ts`

### 0.6 - Migrate options fetching to TanStack Query
- Current `useOptions` hook uses raw `fetch` + `useState`/`useEffect`
- Options fetching is an app shell concern -- the form library only needs to receive option lists
- Create `optionsApi` client in app shell, feed resolved options into form-client/form-engine
- Add an options store or callback pattern in form-client so components can request options
- **Reference**: `src/features/options/useGetOptionsQuery.ts`
- **Files**: `nextsrc/libs/form-engine/components/useOptions.ts`, new `nextsrc/core/apiClient/optionsApi.ts`

**Cypress tests to validate Phase 0:**
- `component-library/dropdown.ts`, `component-library/checkboxes.ts`, `component-library/radio-buttons.ts`, `component-library/multiple-select.ts` -- options rendering
- `frontend-test/options.ts` -- options fetching and display
- `frontend-test/components.ts` -- general component rendering
- `frontend-test/instantiation.ts` -- basic app startup
- `frontend-test/party-selection.ts` -- party selection flow
- `frontend-test/on-entry.ts` -- on-entry redirect logic
- `stateless-app/instantiate-from-query-params.ts` -- query param instantiation

---

## Phase 1: Form Data Persistence (App Shell)

**Goal**: Users can fill in forms and their data is saved to the backend. All persistence logic lives in the app shell, NOT in the form library.

### 1.1 - App shell persistence layer
- Create a persistence handler in the app shell that:
  - Subscribes to `FormClient.onFormDataChange()` events
  - Debounces changes (configurable, default 400ms)
  - Generates JSON patches (diff between last-saved and current data)
  - Sends PATCH requests via `dataApi`
  - Feeds server-calculated values back via `formClient.setFormData()`
- The `formDataStore` itself only tracks in-memory state and emits change notifications
- **Reference**: `src/features/formData/FormDataWriteStateMachine.tsx`, `src/features/formData/jsonPatch/createPatch.ts`
- **Files**: new `nextsrc/features/form/persistence/formDataPersistence.ts`, `nextsrc/core/apiClient/dataApi.ts`

### 1.2 - Dirty tracking and unsaved changes warning
- App shell tracks dirty state (has data changed since last save?)
- `beforeunload` event to warn before leaving
- React Router `useBlocker` for in-app navigation warnings
- **Reference**: `src/features/alertOnChange/`
- **Files**: new `nextsrc/features/form/persistence/useDirtyTracking.ts`

### 1.3 - Stateless form data
- Support stateless apps (no instance, different endpoints)
- App shell uses different persistence strategy for stateless apps (POST instead of PATCH)
- **Reference**: `src/features/stateless/`
- **Files**: `nextsrc/features/instantiate/pages/stateless/StatelessPage.tsx`, `nextsrc/features/form/persistence/formDataPersistence.ts`

**Cypress tests to validate Phase 1:**
- `frontend-test/auto-save-behavior.ts` -- auto-save debouncing and persistence
- `anonymous-stateless-app/auto-save-behavior.ts` -- stateless auto-save
- `stateless-app/stateless.ts` -- stateless form data flow
- `frontend-test/number-text-date.ts` -- data binding and saving for various input types
- `multiple-datamodels-test/saving.ts` -- multi-model saving
- `frontend-test/prefill.ts` -- prefilled data handling

---

## Phase 2: Validation System

**Goal**: Users see validation errors on form fields from all sources.

### 2.1 - Backend validation integration (app shell)
- App shell fetches backend validations after form data save
- Maps backend validation issues to field paths
- Feeds results into form-client via `formClient.setValidations()`
- **Reference**: `src/features/validation/backendValidation/backendValidationQuery.ts`
- **Files**: new `nextsrc/core/apiClient/validationApi.ts`, new `nextsrc/features/form/persistence/backendValidation.ts`

### 2.2 - Schema validation (form-client library)
- Client-side validation against JSON schema -- this CAN live in the form library since it's pure logic
- Validate current form data against schema
- Map schema errors to field paths → store in `validationStore`
- App shell provides the schema to form-client
- **Reference**: `src/features/validation/schemaValidation/`
- **Files**: new `nextsrc/libs/form-client/validation/schemaValidation.ts`, `nextsrc/libs/form-client/stores/validationStore.ts`

### 2.3 - Expression-based validation (form-client library)
- Support `validation` expressions on components (custom rules in layout JSON)
- Pure logic that can live in the form library
- Evaluate via expression evaluator → store in `validationStore`
- **Reference**: `src/features/validation/expressionValidation/`
- **Files**: `nextsrc/libs/form-client/expressions/evaluate.ts`, new `nextsrc/libs/form-client/validation/expressionValidation.ts`

### 2.4 - Validation display and visibility (form-engine library)
- Show errors only after user interaction or attempted navigation
- Add `ComponentValidations` component for error/warning/info messages under fields
- Update all form components to display validations
- This is UI logic → lives in form-engine
- **Reference**: `src/features/validation/ComponentValidations.tsx`
- **Files**: new `nextsrc/libs/form-engine/components/ComponentValidations.tsx`, all existing component files

### 2.5 - Required field validation
- Mark required fields from layout config and data model schema
- Show required indicators in UI (form-engine)
- Validate on submit/navigation (form-client)
- **Files**: `nextsrc/libs/form-engine/components/*.tsx`, `nextsrc/libs/form-client/validation/`

**Cypress tests to validate Phase 2:**
- `frontend-test/validation.ts` -- comprehensive form validation
- `anonymous-stateless-app/validation.ts` -- anonymous validation
- `expression-validation-test/expression-validation.ts` -- expression-based validation
- `expression-validation-test/tags-validation.ts` -- tag validation
- `multiple-datamodels-test/validation.ts` -- cross-model validation
- `frontend-test/group-pets.ts` -- repeating group validation
- `frontend-test/dynamics.ts` -- dynamic visibility affecting validation

---

## Phase 3: Navigation and Process

**Goal**: Users can navigate between pages and process steps.

### 3.1 - Page navigation within a task
- `NavigationButtons` component in form-engine emits navigation events
- App shell handles actual routing based on events
- Support `triggers` on navigation (validate before allowing nav)
- **Reference**: `src/layout/NavigationButtons/`, `src/features/navigation/`
- **Files**: new `nextsrc/libs/form-engine/components/NavigationButtons.tsx`, app shell navigation handler

### 3.2 - Layout settings integration
- App shell fetches layout settings (page order, nav style) via `layoutApi`
- Feeds page order info to form-client/form-engine
- Support `showNavigationBar` / sidebar navigation
- **Reference**: `src/features/form/layoutSettings/LayoutSettingsContext.tsx`
- **Files**: `nextsrc/core/apiClient/layoutApi.ts`, `nextsrc/features/form/pages/task/taskLoader.ts`

### 3.3 - Process management (app shell)
- Add `processApi` client for `getProcessState` and `processNext`
- Implement process step transitions (data → confirm → feedback)
- Handle process state in router -- redirect based on process state
- **Reference**: `src/features/process/`, `src/features/instance/useProcessQuery.ts`
- **Files**: new `nextsrc/core/apiClient/processApi.ts`, `nextsrc/router.tsx`

### 3.4 - Confirmation and receipt pages
- Implement confirmation step (shows summary, allows going back or completing)
- Implement receipt/completion page
- Support custom receipt layouts
- **Reference**: `src/features/receipt/`
- **Files**: new `nextsrc/features/form/pages/confirm/`, new `nextsrc/features/form/pages/receipt/`

**Cypress tests to validate Phase 3:**
- `frontend-test/navigation.ts` -- page navigation
- `frontend-test/page-order-with-dynamics.ts` -- dynamic page ordering
- `frontend-test/all-process-steps.ts` -- complete workflow through all process steps
- `frontend-test/process-next.ts` -- process step transitions
- `frontend-test/custom-confirm.ts` -- custom confirmation page
- `stateless-app/receipt.ts` -- receipt display
- `stateless-app/feedback.ts` -- feedback after submission
- `stateless-app/stateless.ts` -- stateless form navigation
- `stateless-app/party-selection.ts` -- party selection in stateless apps
- `frontend-test/return-url.ts` -- return URL after completion
- `frontend-test/tabbing.ts` -- tab order during navigation
- `navigation-test-subform/navigation.ts` -- navigation with subforms

---

## Phase 4: Remaining Core Components

**Goal**: Cover the most commonly used form components not yet implemented. All components live in `libs/form-engine/components/`.

### 4.1 - Text/date components
- `TimePicker` -- time input with validation
- `Address` -- composite (street, zip, city) -- postal code lookup emits event to app shell
- `Text` -- styled text display
- `Date` -- date input
- **Reference**: `src/layout/Address/`, `src/layout/TimePicker/`, `src/layout/Text/`

### 4.2 - File handling components
- `FileUpload` -- single and multi-file upload with progress
- `FileUploadWithTag` -- file upload with tagging
- `ImageUpload` -- image-specific upload
- `AttachmentList` -- display uploaded files
- Components emit upload/delete events; app shell handles actual API calls via `attachmentsApi`
- **Reference**: `src/features/attachments/`, `src/layout/FileUpload/`

### 4.3 - Lookup components
- `PersonLookup` -- search by national ID
- `OrganisationLookup` -- search by org number
- Components emit lookup events; app shell handles external API calls
- **Reference**: `src/layout/PersonLookup/`, `src/layout/OrganisationLookup/`

### 4.4 - Container/layout components
- `Tabs` -- tabbed container
- `Grid` -- CSS grid-based layout
- `Cards` -- card display
- `SimpleTable` -- data table
- **Reference**: corresponding dirs in `src/layout/`

### 4.5 - Media components
- `Video` -- video player
- `Audio` -- audio player
- `IFrame` -- embedded iframe
- Relatively simple -- mostly rendering with expression-based visibility
- **Reference**: `src/layout/Video/`, `src/layout/Audio/`, `src/layout/IFrame/`

### 4.6 - Action components
- `ActionButton` -- emits action event; app shell calls backend
- `CustomButton` -- configurable button
- `InstantiationButton` -- emits instantiation event
- `AddToList` -- adds items to lists
- **Reference**: corresponding dirs in `src/layout/`

**Cypress tests to validate Phase 4:**
- `component-library/address.ts` -- address component
- `component-library/date-picker.ts`, `component-library/date-formatDate.ts` -- date components
- `component-library/fileupload-attachmentlist.ts` -- file upload + attachment list
- `component-library/image-upload.ts` -- image upload
- `component-library/grid.ts` -- grid component
- `component-library/list.ts` -- list component
- `component-library/link.ts` -- link component
- `component-library/input.ts` -- input component details
- `component-library/text-area.ts` -- textarea details
- `component-library/button.ts` -- button component
- `component-library/divider.ts` -- divider component
- `component-library/accordion.ts`, `component-library/accordion-group.ts` -- accordion
- `component-library/personlookup.ts` -- person lookup
- `component-library/organisationlookup.ts` -- org lookup
- `component-library/repeating-group.ts` -- repeating group details
- `component-library/group.ts` -- group details
- `component-library/pdf.ts` -- PDF component
- `frontend-test/attachments-in-group.ts` -- file attachments in groups
- `frontend-test/grid.ts` -- grid in app context
- `frontend-test/cards.ts` -- card component
- `frontend-test/custom-button.ts` -- custom button
- `frontend-test/tabs.ts` -- tabs component
- `frontend-test/group.ts` -- group container component

---

## Phase 5: Advanced Features

**Goal**: Support complex workflows and edge cases.

### 5.1 - Summary components
- `Summary` -- read-only summary of a component's value
- `Summary2` -- newer format with more flexibility
- Lives in form-engine, uses form-client to resolve values
- **Reference**: `src/layout/Summary/`, `src/layout/Summary2/`

### 5.2 - Advanced expression functions (form-client library)
- **Arithmetic**: add, subtract, multiply, divide
- **Comparisons**: greaterThan, greaterThanEq, lessThan, lessThanEq
- **String**: concat, contains, startsWith, endsWith, stringLength, lowerCase, upperCase
- **Array/component**: component, displayValue, count
- **Date functions**
- **Reference**: `src/features/expressions/expression-functions.ts`
- **Files**: `nextsrc/libs/form-client/expressions/evaluate.ts`

### 5.3 - Multiple data models
- Support instances with multiple data elements
- Track which data element each component binds to
- Handle cross-data-element references in expressions
- App shell manages multiple data elements; form-client supports multi-model binding
- **Reference**: `src/features/datamodel/DataModelsProvider.tsx`

### 5.4 - Options with mapping and source
- Options depending on form data values (mapping)
- Options sourced from repeating groups (source options)
- Options with `secure` flag
- Form-engine requests options; app shell resolves and provides them
- **Reference**: `src/features/options/`

### 5.5 - Language switching
- Support switching between nb/nn/en
- App shell manages language preference (cookie, profile)
- Feeds new text resources into form-client when language changes
- **Reference**: `src/features/language/LanguageProvider.tsx`

**Cypress tests to validate Phase 5:**
- `frontend-test/summary.ts` -- summary component
- `component-library/summary-of-previous-task.ts` -- cross-task summary
- `frontend-test/dynamics.ts` -- expression-driven visibility
- `frontend-test/rules.ts` -- form rule evaluation (expressions)
- `frontend-test/formatting.ts` -- number/date formatting (expression-adjacent)
- `frontend-test/language.ts` -- language switching
- `frontend-test/texts.ts` -- text resources
- `multiple-datamodels-test/fetching.ts`, `multiple-datamodels-test/readonly.ts` -- multi-model
- `frontend-test/options.ts` -- options with mapping
- `anonymous-stateless-app/options.ts` -- anonymous options

---

## Phase 6: Specialized Workflows

**Goal**: Support payment, signing, PDF, and subforms.

### 6.1 - Payment flow
- `Payment` and `PaymentDetails` components in form-engine (emit events)
- App shell handles payment API integration (order details, initiation, status polling)
- **Reference**: `src/features/payment/`

### 6.2 - Signing workflow
- `SigningActions` -- emits signing events
- `SigneeList` -- displays signer status (data from app shell)
- `SigningDocumentList` -- displays documents (data from app shell)
- **Reference**: `src/layout/SigningActions/`, `src/layout/SigneeList/`

### 6.3 - PDF generation
- PDF rendering mode (different layout for print) -- form-engine concern
- PDF format API -- app shell concern
- `PDFPreviewButton` and `PrintButton` -- form-engine components
- **Reference**: `src/features/pdf/`

### 6.4 - Subforms
- Subform instances (nested forms within parent)
- Form-engine supports nested FormClient instances
- App shell manages subform data lifecycle
- **Reference**: `src/features/subformData/`

**Cypress tests to validate Phase 6:**
- `payment-test/payment.ts` -- payment integration
- `signing-test/double-signing.ts` -- multi-signer workflow
- `signing-test/reject.ts` -- signing rejection
- `signering-brukerstyrt/signing.ts` -- user-managed signing
- `frontend-test/pdf.ts` -- PDF generation
- `frontend-test/print-button.ts` -- print functionality
- `component-library/pdf.ts` -- PDF component
- `subform-test/subform.ts` -- subform container
- `subform-test/attachments.ts` -- subform attachments
- `subform-test/pdf.ts` -- subform PDF
- `subform-test/tableEditButton.ts` -- subform table editing
- `service-task/service-task.ts` -- service task execution

---

## Phase 7: Polish and Parity

**Goal**: Reach full feature parity with `src/`.

### 7.1 - Remaining components (form-engine)
- `List` -- data list
- `Map` -- geographic map
- `Likert` -- Likert scale container
- `LikertItem` -- Likert scale item
- `Custom` -- user-provided custom components
- `InstanceInformation` -- instance metadata display
- `Option` -- standalone option display

### 7.2 - DevTools
- Developer tools panel for debugging layouts, expressions, and state
- Can inspect both form-client stores and app shell state
- **Reference**: `src/features/devtools/`

### 7.3 - External API integration
- Support external API calls from layout configuration
- Form-engine emits API request events; app shell handles calls
- **Reference**: `src/features/externalApi/`

### 7.4 - Performance optimization
- Component-level memoization in form-engine
- Optimized store selectors to minimize re-renders
- Consider immutable data structures for form data store

### 7.5 - Accessibility audit
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus management during navigation and validation

**Cypress tests to validate Phase 7:**
- `frontend-test/likert.ts` -- Likert scale
- `frontend-test/list-component.ts` -- list component
- `frontend-test/mobile.ts` -- mobile responsive behavior
- `frontend-test/sort-order.ts` -- component sorting
- `frontend-test/ui-settings.ts` -- UI configuration
- `frontend-test/footer.ts` -- footer component
- `frontend-test/message.ts` -- message display
- `frontend-test/on-entry.ts` -- on-entry logic
- `frontend-test/redirect.ts` -- URL redirection
- `frontend-test/self-identified-user.ts` -- self-identified user
- `frontend-test/hide-row-in-group.ts` -- conditional row visibility
- `frontend-test/accordion.ts` -- accordion in app context
- `component-library/title-tag-updates.ts` -- HTML title updates
- All `testWcag` calls across the suite -- accessibility validation

**Final validation: ALL 93 integration Cypress specs must pass.**

---

## Dependency Graph

```
Phase 0 (Restructure + Foundation)
  ├──→ Phase 1 (Persistence in App Shell)
  ├──→ Phase 2 (Validation) [needs Phase 1 for backend validation after save]
  └──→ Phase 3 (Navigation + Process) [needs Phase 2 for nav triggers]

Phase 1 + 2 + 3 ──→ Phase 4 (Core Components)  ┐
                 ──→ Phase 5 (Advanced Features) ├──→ Phase 6 (Specialized)
                                                 ├──→ Phase 7 (Polish)
```

Phases 4 and 5 can largely proceed in parallel once Phases 1-3 are solid.

---

## Cross-Cutting Concerns (Apply Throughout)

### Library boundary enforcement
- `libs/form-client` and `libs/form-engine` must NEVER import from `nextsrc/core/apiClient/`, `nextsrc/features/instantiate/`, or other app shell code
- Use callbacks, events, or dependency injection for anything that requires app-specific behavior
- Consider ESLint rules or TypeScript path restrictions to enforce boundaries

### Testing
- Form library: unit tests with mock data (no API mocking needed since it doesn't call APIs)
- App shell: integration tests with TanStack Query and mock API responses
- Adapt old `src/test/renderWithProviders.tsx` for the new architecture

### Type safety
- Avoid `any` and type casting (`as`)
- Use generated types from `config.generated.ts` properly
- Improve component registry typing (current casts like `component as CompInputExternal`)

### API client pattern (app shell only)
- All API clients in `nextsrc/core/apiClient/`
- Use TanStack Query `queryOptions` for sharing query configs
- Reference TkDodo's blog for best practices

### Styling strategy
- **Reuse CSS from the old codebase (`src/`)** as much as possible -- the existing CSS Modules (`.module.css` files) already work and are tested
- Import directly from `src/` paths or copy the relevant `.module.css` files to `nextsrc/` as needed
- Use `@digdir/designsystemet-react` components instead of raw HTML elements
- Only write new CSS when no existing styles cover the need

---

## Component Migration Checklist

| Component | Status | Phase | Layer |
|-----------|--------|-------|-------|
| Input | Done | - | form-engine |
| TextArea | Done | - | form-engine |
| Number | Done | - | form-engine |
| Datepicker | Done | - | form-engine |
| Dropdown | Done | - | form-engine |
| RadioButtons | Done | - | form-engine |
| Checkboxes | Done | - | form-engine |
| MultipleSelect | Done | - | form-engine |
| RepeatingGroup | Done | - | form-engine |
| Group | Done | - | form-engine |
| Header | Done | - | form-engine |
| Paragraph | Done | - | form-engine |
| Image | Done | - | form-engine |
| Divider | Done | - | form-engine |
| Link | Done | - | form-engine |
| Alert | Done | - | form-engine |
| Button | Done | - | form-engine |
| ButtonGroup | Done | - | form-engine |
| Panel | Done | - | form-engine |
| Accordion | Done | - | form-engine |
| AccordionGroup | Done | - | form-engine |
| NavigationBar | Done | - | form-engine |
| NavigationButtons | TODO | 3.1 | form-engine |
| Text | TODO | 4.1 | form-engine |
| TimePicker | TODO | 4.1 | form-engine |
| Address | TODO | 4.1 | form-engine |
| Date | TODO | 4.1 | form-engine |
| FileUpload | TODO | 4.2 | form-engine |
| FileUploadWithTag | TODO | 4.2 | form-engine |
| ImageUpload | TODO | 4.2 | form-engine |
| AttachmentList | TODO | 4.2 | form-engine |
| PersonLookup | TODO | 4.3 | form-engine |
| OrganisationLookup | TODO | 4.3 | form-engine |
| Tabs | TODO | 4.4 | form-engine |
| Grid | TODO | 4.4 | form-engine |
| Cards | TODO | 4.4 | form-engine |
| SimpleTable | TODO | 4.4 | form-engine |
| Video | TODO | 4.5 | form-engine |
| Audio | TODO | 4.5 | form-engine |
| IFrame | TODO | 4.5 | form-engine |
| ActionButton | TODO | 4.6 | form-engine |
| CustomButton | TODO | 4.6 | form-engine |
| InstantiationButton | TODO | 4.6 | form-engine |
| AddToList | TODO | 4.6 | form-engine |
| Summary | TODO | 5.1 | form-engine |
| Summary2 | TODO | 5.1 | form-engine |
| Payment | TODO | 6.1 | form-engine |
| PaymentDetails | TODO | 6.1 | form-engine |
| SigningActions | TODO | 6.2 | form-engine |
| SigneeList | TODO | 6.2 | form-engine |
| SigningDocumentList | TODO | 6.2 | form-engine |
| PDFPreviewButton | TODO | 6.3 | form-engine |
| PrintButton | TODO | 6.3 | form-engine |
| Subform | TODO | 6.4 | form-engine |
| List | TODO | 7.1 | form-engine |
| Map | TODO | 7.1 | form-engine |
| Likert | TODO | 7.1 | form-engine |
| LikertItem | TODO | 7.1 | form-engine |
| Custom | TODO | 7.1 | form-engine |
| InstanceInformation | TODO | 7.1 | form-engine |
| Option | TODO | 7.1 | form-engine |

---

## Critical Files

| File | Role | Layer | Phases |
|------|------|-------|--------|
| `nextsrc/libs/form-client/form-client.ts` | Core orchestrator -- add change notification/callback API | form-client | 0 |
| `nextsrc/libs/form-client/stores/formDataStore.ts` | In-memory data only -- emit change events, NO persistence | form-client | 0, 1 |
| `nextsrc/libs/form-client/stores/validationStore.ts` | Multiple validation sources, visibility rules | form-client | 2 |
| `nextsrc/libs/form-client/expressions/evaluate.ts` | Extend for full expression language | form-client | 5 |
| `nextsrc/libs/form-engine/FormEngine.tsx` | Component renderer -- error boundaries, validation display | form-engine | 0, 2, 4 |
| `nextsrc/libs/form-engine/components/index.ts` | Component registry -- add all new components | form-engine | 3-7 |
| new `nextsrc/features/form/persistence/` | App shell persistence layer (debounce, JSON patch, save) | app shell | 1 |
| `nextsrc/core/apiClient/dataApi.ts` | PATCH/save endpoints, schema fetching | app shell | 1, 2 |
| `nextsrc/router.tsx` | Process-aware routing, confirmation/receipt pages | app shell | 3 |
| `nextsrc/index.tsx` | Error boundaries, auth provider, wiring | app shell | 0 |

---

## Reference Files in Old Codebase

| File | What to learn from it |
|------|----------------------|
| `src/features/formData/FormDataWriteStateMachine.tsx` | Auto-save state machine pattern (adapt for app shell) |
| `src/features/formData/jsonPatch/createPatch.ts` | JSON patch generation |
| `src/features/validation/validationContext.tsx` | 4-source validation merging |
| `src/features/validation/backendValidation/backendValidationQuery.ts` | Backend validation fetching |
| `src/features/expressions/expression-functions.ts` | Full expression function implementations |
| `src/features/navigation/useNavigatePage.ts` | Page navigation logic |
| `src/features/process/` | Process workflow management |
| `src/features/attachments/` | File upload/management patterns |
| `src/features/payment/PaymentProvider.tsx` | Payment workflow |
| `src/queries/queries.ts` | All API endpoints and mutations |