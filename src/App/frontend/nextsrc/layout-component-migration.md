# Component Migration Analysis — src/layout → nextsrc/libs/form-engine/components

## Context

nextsrc has 34 of ~60 layout components implemented. We need to migrate all remaining components, including styling and summary renderers. This plan categorizes every unmigrated component by readiness and identifies infrastructure gaps.

## Current nextsrc Infrastructure

**Available:** `useBoundValue`, `useTextResource`, `useLanguage`, `useOptions`, `useFieldValidations`, `useRequiredValidation`, `useProcessActions`, `useFormClient`, `usePageOrder`, `useGroupArray`, `usePushArrayItem`, `useLayout`, expression evaluation, ComponentValidations, 3 Zustand stores, CSS Modules, `@digdir/designsystemet-react`, `date-fns`, `@tanstack/react-query`, `useIsMobile`, `useMultiBinding`

**NOT available:** File upload/attachments, payment, signing, subforms, map/Leaflet integration, PDF mode detection, layout lookup/node tree, `useAlertOnChange`

**Added in Batch 3:** `lookupApi` (org/person lookup API client), `lookupValidation` (org number + SSN checksum validators), `usePostPlace` (postal code → place name lookup via TanStack Query)

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
| **TimePicker** | ✅ Done — native `<input type="time">`, Textfield, min/max/step support |
| **Address** | ✅ Done — 5× `useBoundValue`, `usePostPlace` auto-fill, simplified mode, CSS module |
| **Grid** | ✅ Done — Table layout with text/label/component cells, mobile fieldset fallback, CSS module |
| **Cards** | ✅ Done — CSS Grid, `findComponentById` for media + children, `langAsString` for text |
| **Likert** | Add `useIsMobileOrTablet()`. Migrate with LikertItem. Uses existing `useGroupArray` + `useOptions`. Copy CSS |
| **LikertItem** | Tightly coupled to Likert — migrate together. Copy `LikertItemComponent.module.css` |
| **Custom** | ✅ Done — Web component bridge, `useMultiBinding` for dynamic bindings, dataChanged events |
| **OrganisationLookup** | ✅ Done — TanStack Query lookup, `checkValidOrgNr`, Fieldset + grid layout, CSS module |
| **PersonLookup** | ✅ Done — TanStack Query lookup, `checkValidSsn`, 5-field binding, error handling (403/429), CSS module |
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
- **RepeatingGroup** — ✅ Done: edit mode (showTable), delete rows, pagination, validation cleanup, table headers, CSS module. Remaining: hideTable/showAll/onlyTable modes, multi-page editing, per-row expression evaluation, row UUIDs, alertOnDelete, maxCount/minCount, attachment cleanup
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

**Batch 2 — RepeatingGroup upgrade:** ✅ DONE
Added: `removeArrayItem` store method + `useRemoveArrayItem` hook, `clearByPathPrefix` validation cleanup, table layout with column headers from child titles, inline edit mode (showTable), delete with validation cleanup, pagination, CSS module, `useRowCellValue` display hook

**Batch 3 — Tier 2 smallest first (5 components):** ✅ DONE
TimePicker, Address, Cards, OrganisationLookup, PersonLookup — Grid deferred to Batch 4
Added shared infrastructure: `lookupApi.ts`, `lookupValidation.ts`, `usePostPlace.ts`

**Batch 4 — Tier 2 medium complexity:** ✅ DONE (Grid + Custom)
Grid, Custom — migrated. Added shared infrastructure: `useMultiBinding` (dynamic data model bindings), `useIsMobile` (responsive breakpoint).
Deferred: Likert + LikertItem (needs complete rethink), List (needs dataListApi), CustomButton + InstantiationButton (heavy infrastructure: data locking, server actions, authorization), SimpleTable + AddToList (removed from batch)

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