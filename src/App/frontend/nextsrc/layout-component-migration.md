# Component Migration Analysis — src/layout → nextsrc/libs/form-engine/components

## Context

nextsrc has 34 of ~60 layout components implemented. We need to migrate all remaining components, including styling and summary renderers. This plan categorizes every unmigrated component by readiness and identifies infrastructure gaps.

## Current nextsrc Infrastructure

**Available:** `useBoundValue`, `useTextResource`, `useLanguage`, `useOptions`, `useFieldValidations`, `useRequiredValidation`, `useProcessActions`, `useFormClient`, `usePageOrder`, `useGroupArray`, `usePushArrayItem`, `useLayout`, expression evaluation, ComponentValidations, 3 Zustand stores, CSS Modules, `@digdir/designsystemet-react`, `date-fns`, `@tanstack/react-query`

**NOT available:** File upload/attachments, payment, signing, subforms, map/Leaflet integration, PDF mode detection, `useIsMobile()`, multi-field binding helper, layout lookup/node tree, `useAlertOnChange`, `usePostPlace` (postal code lookup)

---

## Tier 1 — ✅ DONE (10 components, zero new infrastructure)

All 10 migrated. Shared `findComponentById` utility extracted to `utils/findComponent.ts`.

| Component | Status | Notes |
|-----------|--------|-------|
| **Text** | ✅ Done | Display-only, `useTextResource` + `useLanguage` |
| **Date** | ✅ Done | `date-fns` parseISO/format, custom format support |
| **Option** | ✅ Done | `useOptions` + Option.module.css |
| **PrintButton** | ✅ Done | Designsystemet Button, `window.print()` |
| **IFrame** | ✅ Done | Sandboxed iframe, inline `getSandboxProperties`, auto-resize |
| **Audio** | ✅ Done | `<audio controls>`, language-keyed src |
| **Video** | ✅ Done | `<video controls>`, language-keyed src |
| **ActionButton** | ✅ Done | `useProcessActions().submit()` |
| **Summary** (v1) | ✅ Done | Reuses shared `findComponentById`, Summary.module.css |
| **Tabs** | ✅ Done | Designsystemet Tabs, resolves children via `findComponentById`, Tabs.module.css |

---

## Tier 2 — Migrate with Minor Additions (14 components)

| Component | Minor addition needed |
|-----------|----------------------|
| **TimePicker** | Simple `<input type="time">` + port `useTimePickerValidation` (~30 lines) |
| **Address** | Call `useBoundValue` 5× for multi-field. Add `usePostPlace(zipCode)` hook (GET to postal API, ~20 lines). Copy `AddressComponent.module.css` |
| **Grid** | Add `useIsMobile()` hook (~10 lines, `window.matchMedia`). Copy `Grid.module.css` |
| **Cards** | Add small `CardContext` provider. Copy `Cards.module.css` |
| **Likert** | Add `useIsMobileOrTablet()`. Migrate with LikertItem. Uses existing `useGroupArray` + `useOptions`. Copy CSS |
| **LikertItem** | Tightly coupled to Likert — migrate together. Copy `LikertItemComponent.module.css` |
| **Custom** | Web component bridge. Adapt multi-binding to multiple `useBoundValue` calls |
| **OrganisationLookup** | Port TanStack Query lookup (GET to `/api/v1/lookup/organisation/{orgNr}`). Multi-binding. Copy CSS |
| **PersonLookup** | Same pattern as OrganisationLookup (POST to `/api/v1/lookup/person`). Copy CSS |
| **List** | Add `useDataListQuery` fetch wrapper. Add `useIsMobile`. Copy `ListComponent.module.css` |
| **SimpleTable** | Add `useRemoveArrayItem` to formDataStore. Port table rendering |
| **AddToList** | Expose schema lookup as hook. Uses existing `usePushArrayItem` |
| **CustomButton** | Add action-performing context bridge (like ProcessActionsContext). Medium-large effort |
| **InstantiationButton** | Add instantiation context bridge with `instantiate()` callback. Copy CSS |

---

## Tier 3 — Blocked by Major Infrastructure (12 components)

| Infrastructure needed | Components blocked |
|----------------------|-------------------|
| **Attachment subsystem** (store, upload API, dropzone, virus scan) | FileUpload, FileUploadWithTag, AttachmentList |
| **Payment subsystem** (payment API, order details, status) | Payment, PaymentDetails |
| **Signing subsystem** (signing API, signee list, document list) | SigningActions, SigneeList, SigningDocumentList |
| **Instance context bridge** (instance data query, owner party) | InstanceInformation, PDFPreviewButton |
| **Subform subsystem** (subform mutations, navigation, data sources) | Subform |
| **Map/Leaflet integration** (geo utilities, feature modules) | Map |

---

## Existing 24 Components — Upgrade Gaps

**High priority (significant missing functionality):**
- **RepeatingGroup** — Missing: edit mode, delete, pagination, validation display, table headers
- **Summary2** — Only handles `target.type === 'component'` with `simpleBinding`. Missing: page/layoutSet targets, multi-binding, option-value display, group/repeating group summary, per-component summary renderers

**Medium priority (missing common features):** ✅ DONE
- **Input** — ✅ Added: readOnly, formatting (number/currency via react-number-format), maxLength, autocomplete, prefix/suffix, description. Uses Textfield from designsystemet. Remaining: inputMode/pattern mobile keyboard, saveWhileTyping debounce, paste workaround, local state for trailing zeros
- **TextArea** — ✅ Added: readOnly, maxLength counter, autocomplete, description. Switched to Textfield multiline from designsystemet
- **Datepicker** — ✅ Added: readOnly, min/maxDate with keyword support (today/yesterday/tomorrow/oneYearAgo/oneYearFromNow). Remaining: calendar popup (react-day-picker), custom date format display
- **Paragraph** — ✅ Added: help text toggle via `<details>/<summary>` element
- **Panel** — ✅ Rewritten: variant support (info/warning/error/success), showIcon with @navikt/aksel-icons, proper CSS module with variant colors, markdown body via marked, Heading from designsystemet. Remaining: mobile layout, FullWidthWrapper

**Low priority (minor polish):**
- Dropdown, RadioButtons, Checkboxes, MultipleSelect — Missing: readOnly, description per option
- Button, Header, Link, Image, Alert — Minor prop gaps (variants, sizes, styles)
- Accordion, AccordionGroup, Group — Verify alignment with designsystemet API

---

## Recommended Migration Order

**Batch 1 — Tier 1 quick wins (10 components):** ✅ DONE

**Batch 1.5 — Medium priority component upgrades (5 components):** ✅ DONE
Input, TextArea, Datepicker, Paragraph, Panel — upgraded with common features, restructured into per-component folders

**Batch 2 — RepeatingGroup upgrade:** ← NEXT
Bring RepeatingGroup to feature parity: edit mode, delete rows, pagination, validation display, table headers

**Batch 3 — Tier 2 smallest first:**
TimePicker, Address, Grid, Cards, OrganisationLookup, PersonLookup

**Batch 4 — Tier 2 medium complexity:**
Likert + LikertItem, Custom, List, SimpleTable, AddToList, InstantiationButton, CustomButton

**Batch 5 — Tier 3 by subsystem (separate phases):**
Instance context → Attachments → Signing → Payment → Subforms → Map

---

## Summary Renderer Migration

Almost all input components in src/ have summary renderers (`renderSummary2` or dedicated Summary components). These should be migrated alongside the component or as a follow-up. The Summary2 component in nextsrc needs to be extended to dispatch to per-component summary renderers.

---

## Verification

1. `yarn tsc` — no type errors after each batch
2. Each new component renders in the form engine with test layout data
3. Summary renderers display correct values for each component type
4. CSS modules render correctly (no missing styles)