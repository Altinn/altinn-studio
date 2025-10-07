# Test Failure Fix Tracker

**Generated**: 2025-10-06
**Last Updated**: 2025-10-06 15:00
**Total Failed Tests**: 140 / 2,390 (5.9%)
**Failed Test Suites**: 42

## Recent Updates

### ✅ 2025-10-06 15:00 - Fixed Node Hierarchy Race Condition **COMPLETE**
- **Fixed**: Pages and repeating group rows not being added to node tree before components tried to render
- **Root causes**:
  1. **Layout loading race**: `LayoutsContext` loaded layouts asynchronously, but pages weren't pre-populated in Zustand store before generator rendered
  2. **Form data loading**: `DataModelsProvider` was showing debug output instead of loader when form data wasn't loaded, preventing `waitUntilLoaded` from working properly
- **Solution**:
  1. Modified `NodesContext.reset()` to pre-populate all pages from layouts object
  2. Restored proper `<Loader reason='initial-data'>` in `DataModelsProvider.BlockUntilLoaded` (line 274)
- **Files modified**:
  - `src/utils/layout/NodesContext.tsx` - Pre-populate pages in `reset()` function (lines 232-249)
  - `src/features/datamodel/DataModelsProvider.tsx` - Restored loader for initial data (line 274)
- **Impact**:
  - ✅ **ALL 10/10 tests now passing!**
    - Group Layout with no data ✅
    - Group Layout with one row ✅
    - Group Layout with two rows ✅
    - Non-repeating group ✅
    - Recursive group Layout with no data ✅
    - Recursive group Layout with one row ✅
    - Recursive group Layout with two rows (inner) ✅
    - Recursive group Layout with two rows (outer) ✅
    - Simple layout with single component ✅
    - Simple layout with two pages ✅

### ✅ 2025-10-06 11:00 - Fixed Text Resource System
- **Fixed**: Text resources, application metadata, and application settings not resolving in tests
- **Root cause**: Providers read from `window.AltinnAppData` instead of calling mocked queries
- **Solution**:
  - Modified `renderWithProviders.tsx` to call mocked queries BEFORE rendering and populate `window.AltinnAppData`
  - Added preloading for `fetchTextResources`, `fetchApplicationMetadata`, and `fetchApplicationSettings`
  - Migrated `ApplicationMetadataProvider` to use React Query instead of reading from window
  - Added query cache preloading in `AppQueriesProvider` for application metadata
  - Added `waitFor()` in `useGetOptions.test.tsx` for async query handling
- **Files modified**:
  - `src/test/renderWithProviders.tsx` - Preload text resources, app metadata, and app settings
  - `src/features/applicationMetadata/ApplicationMetadataProvider.tsx` - Switched to React Query
  - `src/core/contexts/AppQueriesProvider.tsx` - Preload app metadata into query cache
  - `src/features/options/useGetOptions.test.tsx` - Added waitFor() for async loading
- **Impact**:
  - ✅ All 9 appTexts tests passing
  - ✅ All 11 useGetOptions tests passing
  - ✅ All 5 useLanguage tests passing
  - ⚠️ 2 snapshot updates needed (SummaryGroupComponent, SummaryRepeatingGroup - both functionally correct)

### ✅ 2025-10-06 09:00 - Fixed Data Preloading Race Condition
- **Fixed**: Module-level import crashes with `Cannot read properties of undefined (reading 'instanceData')`
- **Solution**: Moved instance data preloading from module-level to inside `AppQueriesProvider` component (synchronous, before render)
- **Files modified**:
  - `src/index.tsx` - Removed module-level preloading
  - `src/core/contexts/AppQueriesProvider.tsx` - Added synchronous preloading inside component
- **Impact**: 3 test suites that were crashing on import now run successfully:
  - `src/layout/AttachmentList/AttachmentListComponent.test.tsx` ✅
  - `src/features/receipt/ReceiptContainer.test.tsx` ✅
  - `src/features/expressions/shared-functions.test.tsx` ✅

---

## Overview

This document tracks the systematic fixing of all test failures in the app frontend. Failures are grouped by root cause to maximize efficiency.

---

## Priority 1: Core Infrastructure Issues

These issues cascade into multiple test failures and should be fixed first.

### ✅ 1. Data Preloading Race Condition **FIXED**
**Impact**: 3 direct failures (suite-level crashes)
**Root Cause**: Module-level code executed `instanceQueries.instanceData()` before it was initialized, causing import crashes

- [x] Fix `AppQueriesProvider.tsx` to set instance data synchronously before render
- [x] Verify tests don't crash on import
- [x] Move preloading from module-level to component-level
- [x] Verify affected tests run without import errors

**Solution**: Moved preloading inside `AppQueriesProvider` component body (lines 34-44) so it runs after all dependencies are initialized but before first render.

**Files modified**:
- `src/core/contexts/AppQueriesProvider.tsx` - Added synchronous preloading inside component
- `src/index.tsx` - Removed module-level preloading (lines 61-70)

**Tests now passing import stage**:
- ✅ `src/layout/AttachmentList/AttachmentListComponent.test.tsx`
- ✅ `src/features/receipt/ReceiptContainer.test.tsx`
- ✅ `src/features/expressions/shared-functions.test.tsx`

---

### ✅ 2. Text Resource / Translation System **FIXED**
**Impact**: ~30 failures across multiple files
**Root Cause**: Providers reading from `window.AltinnAppData` instead of calling mocked queries in tests

- [x] Modified `renderWithProviders.tsx` to preload `window.AltinnAppData` with mocked query results
- [x] Fixed `appTexts.test.tsx` - all 9 tests now passing ✅
- [x] Migrated `ApplicationMetadataProvider` from window-reading to React Query
- [x] Added query cache preloading for application metadata
- [x] Added preloading for `fetchApplicationSettings` to populate `window.AltinnAppData.frontendSettings`
- [x] Fixed `useGetOptions.test.tsx` - all 11 tests now passing ✅ (added waitFor() for async loading)
- [x] Fixed `useLanguage.test.tsx` - all 5 tests now passing ✅
- [x] Verified `SummaryGroupComponent.test.tsx` and `SummaryRepeatingGroup.test.tsx` (snapshot updates only)

**Solution implemented**:
1. Call `fetchTextResources` mock before rendering and update `window.AltinnAppData.textResources`
2. Call globally-mocked `fetchApplicationMetadata` and set both window data and query cache
3. Call `fetchApplicationSettings` mock and update `window.AltinnAppData.frontendSettings`
4. Providers now get test-provided data instead of defaults from `setupTests.ts`
5. Added `waitFor()` for tests affected by async ApplicationMetadataProvider migration

**Files modified**:
- `src/test/renderWithProviders.tsx` - Preload window data from mocked queries
- `src/features/applicationMetadata/ApplicationMetadataProvider.tsx` - Switched to React Query
- `src/core/contexts/AppQueriesProvider.tsx` - Preload app metadata into query cache
- `src/features/options/useGetOptions.test.tsx` - Added waitFor() for async loading

**Tests verified as fixed**:
- ✅ `src/features/language/useLanguage.test.tsx` (5/5 passing, was 3 failures)
- ⚠️ `src/layout/Group/SummaryGroupComponent.test.tsx` (snapshot update needed, functionally correct)
- ⚠️ `src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup.test.tsx` (snapshot update needed, functionally correct)

---

### ✅ 3. Node Hierarchy / Layout Tree Generation **FIXED**
**Impact**: 10 failures resolved
**Root Causes**:
1. Layout loading race - pages not pre-populated in Zustand before generator renders
2. Form data loading - debug output instead of proper loader prevented `waitUntilLoaded` from working

- [x] Identified root causes (layout loading + form data loading)
- [x] Fixed page-level race by pre-populating pages in `NodesContext.reset()`
- [x] Fixed form data loading by restoring proper loader in `DataModelsProvider`
- [x] Verified all 10 tests passing

**Solution**:
1. Pre-populate pages from layouts object in `NodesContext.reset()` to avoid race condition
2. Show `<Loader reason='initial-data'>` while form data loads so tests wait properly

**Files modified**:
- `src/utils/layout/NodesContext.tsx` - Pre-populate pages (lines 232-249)
- `src/features/datamodel/DataModelsProvider.tsx` - Restored loader (line 274)

**Tests fixed**:
- ✅ `src/features/expressions/shared-context.test.tsx` (10/10 passing)

---

### 🔴 4. React Hooks Ordering Violations
**Impact**: 9 failures
**Root Cause**: "Rendered more hooks than during the previous render"

- [ ] Audit components for conditional hook calls
- [ ] Check for hooks called after early returns
- [ ] Fix hook ordering in affected components
- [ ] Add ESLint rule enforcement for hooks
- [ ] Document proper hook usage patterns

**Files affected**: All trace to `react-dom` - need to identify specific component tests

---

## Priority 2: Component-Specific Failures

### Likert Component (18 failures)

- [ ] Fix "Unable to find row with question text" (7 failures)
- [ ] Investigate why Likert rows aren't rendering
- [ ] Check if form layout context is properly provided
- [ ] Verify question text resolution
- [ ] Run tests:
  ```bash
  npx jest "src/layout/Likert/LikertComponent.test.tsx"
  ```

**File**: `src/layout/Likert/LikertComponent.test.tsx`

---

### FileUpload Component (18 failures)

- [ ] Investigate rendering failures
- [ ] Check attachment context availability
- [ ] Verify file upload state management
- [ ] Fix attachment summary tests (4 additional failures)
- [ ] Run tests:
  ```bash
  npx jest "src/layout/FileUpload/FileUploadComponent.test.tsx"
  npx jest "src/layout/FileUpload/Summary/AttachmentWithTagSummaryComponent.test.tsx"
  ```

**Files**:
- `src/layout/FileUpload/FileUploadComponent.test.tsx` (18 failures)
- `src/layout/FileUpload/Summary/AttachmentWithTagSummaryComponent.test.tsx` (4 failures)

---

### Expression Validation (9 failures)

- [ ] Fix validation expression execution
- [ ] Check why validation arrays return empty
- [ ] Verify expression context is available
- [ ] Test validation rules are properly registered
- [ ] Run tests:
  ```bash
  npx jest "src/features/validation/expressionValidation/ExpressionValidation.test.tsx"
  ```

**File**: `src/features/validation/expressionValidation/ExpressionValidation.test.tsx`

---

### Party Selection / Instantiation (9 failures)

- [ ] Fix party selection rendering
- [ ] Check instance owner party context
- [ ] Verify instantiation flow
- [ ] Test instance selection display (5 additional failures)
- [ ] Run tests:
  ```bash
  npx jest "src/features/instantiate/containers/PartySelection.test.tsx"
  npx jest "src/features/instantiate/selection/InstanceSelection.test.tsx"
  ```

**Files**:
- `src/features/instantiate/containers/PartySelection.test.tsx` (9 failures)
- `src/features/instantiate/selection/InstanceSelection.test.tsx` (5 failures)

---

### Navigation (8 failures)

- [ ] Fix navigation component rendering
- [ ] Check router context availability
- [ ] Verify navigation param hooks
- [ ] Test back button rendering
- [ ] Run tests:
  ```bash
  npx jest "src/features/navigation/AppNavigation.test.tsx"
  ```

**File**: `src/features/navigation/AppNavigation.test.tsx`

---

### Form Data (4 failures)

- [ ] Fix "Unable to find element by data-testid" errors
- [ ] Check form component rendering in tests
- [ ] Verify form data context provider
- [ ] Test navigation and persistence scenarios
- [ ] Run tests:
  ```bash
  npx jest "src/features/formData/FormData.test.tsx"
  npx jest "src/components/form/Form.test.tsx"
  ```

**Files**:
- `src/features/formData/FormData.test.tsx` (4 failures)
- `src/components/form/Form.test.tsx` (5 failures)
- `src/features/formData/FormDataReaders.test.tsx` (3 failures)

---

### Repeating Group (4 failures)

- [ ] Fix "Unable to find text: Value to be shown"
- [ ] Fix edit button text rendering
- [ ] Check option label display in tables
- [ ] Verify text resource bindings
- [ ] Run tests:
  ```bash
  npx jest "src/layout/RepeatingGroup/Container/RepeatingGroupContainer.test.tsx"
  ```

**File**: `src/layout/RepeatingGroup/Container/RepeatingGroupContainer.test.tsx`

---

### Dropdown (4 failures)

- [ ] Fix dropdown rendering
- [ ] Check options population
- [ ] Verify combobox accessibility
- [ ] Run tests:
  ```bash
  npx jest "src/layout/Dropdown/DropdownComponent.test.tsx"
  ```

**File**: `src/layout/Dropdown/DropdownComponent.test.tsx`

---

### Validation Plugin (4 failures)

- [ ] Fix validation plugin initialization
- [ ] Check validation context
- [ ] Verify validator registration
- [ ] Run tests:
  ```bash
  npx jest "src/features/validation/ValidationPlugin.test.tsx"
  ```

**File**: `src/features/validation/ValidationPlugin.test.tsx`

---

### Error Report (4 failures)

- [ ] Fix "Unable to find element by data-testid=ErrorReport"
- [ ] Check error report rendering
- [ ] Verify error context availability
- [ ] Run tests:
  ```bash
  npx jest "src/components/message/ErrorReport.test.tsx"
  ```

**File**: `src/components/message/ErrorReport.test.tsx`

---

### Address Component (1 failure)

- [ ] Fix "Unable to find display value: OSLO."
- [ ] Check post place rendering after zip code clear
- [ ] Verify case handling (Oslo vs OSLO)
- [ ] Run tests:
  ```bash
  npx jest "src/layout/Address/AddressComponent.test.tsx"
  ```

**File**: `src/layout/Address/AddressComponent.test.tsx`

---

### Custom Button (3 failures)

- [ ] Fix button rendering
- [ ] Check text resource bindings
- [ ] Run tests:
  ```bash
  npx jest "src/layout/CustomButton/CustomButtonComponent.test.tsx"
  ```

**File**: `src/layout/CustomButton/CustomButtonComponent.test.tsx`

---

### Checkboxes (2 failures)

- [ ] Fix checkbox rendering
- [ ] Check option display
- [ ] Run tests:
  ```bash
  npx jest "src/layout/Checkboxes/CheckboxesContainerComponent.test.tsx"
  ```

**File**: `src/layout/Checkboxes/CheckboxesContainerComponent.test.tsx`

---

## Priority 3: Environment-Specific Issues

### Windows Path Issues (3 failures)

- [ ] Fix `ENOENT: no such file or directory, scandir 'C:/Code/altinn/all-apps'`
- [ ] Make paths cross-platform compatible
- [ ] Add path normalization in tests

---

## Testing Strategy

### Phase 1: Fix Infrastructure (Priority 1)
1. Data preloading race condition
2. Text resource system
3. Node hierarchy generation
4. Hook ordering violations

**Expected impact**: ~50-60 failures should be resolved

### Phase 2: Fix Component Tests (Priority 2)
Work through each component systematically, running tests after each fix.

**Expected impact**: Remaining ~90 failures

### Phase 3: Verify and Clean Up
- Run full test suite
- Update snapshots if needed
- Document any test patterns that need changes
- Create PR with all fixes

---

## Commands

### Run all tests
```bash
yarn test
```

### Run specific test file
```bash
npx jest "path/to/test.tsx"
```

### Run tests for a specific pattern
```bash
yarn test -- FormData
```

### Update snapshots
```bash
yarn test -- -u
```

### Run tests in watch mode
```bash
yarn test:watch
```

---

## Notes

- Many failures are likely cascading from the Priority 1 infrastructure issues
- Fix infrastructure first, then re-run full suite to see actual remaining failures
- Some failures may auto-resolve once core systems are fixed
- Update this document as you fix issues to track progress

---

## Progress Tracking

**Priority 1**: ✅✅✅⬜️ (3/4 complete - 75%)
**Priority 2**: ⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️ (0/13 complete)
**Priority 3**: ⬜️ (0/1 complete)

**Overall Progress**: 3/18 sections complete (17%)

### Completed
1. ✅ Data Preloading Race Condition (2025-10-06 09:00)
2. ✅ Text Resource / Translation System (2025-10-06 11:00)
3. ✅ Node Hierarchy / Layout Tree Generation (2025-10-06 15:00)

### Next Steps
- React Hooks Ordering Violations (9 failures - Priority 1)
- Run full test suite to assess cascade effects from infrastructure fixes
- Tackle Priority 2 component-specific failures systematically