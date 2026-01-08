# Language Switching Bug Analysis

## Problem Summary

When users switch languages in the frontend test app, text translations work for regular text resources but fail for label data bindings. Specifically:
- Expected: "Blå,Cyan" should change to "Blue,Cyan" when switching to English
- Actual: Text remains "Blå,Cyan" even after language switch

## Root Cause Analysis

### The Issue
The language switching functionality fails due to **data loading initialization changes** that prevent proper useEffect triggering. The system has transitioned from a simple React Query approach to a complex HTML-based data initialization with conditional fetching, which breaks the reactive updates needed for language switching.

### Data Loading Architecture Changes
**Main Branch (Working)**:
- Simple `useGetAppLanguageQuery()` without parameters - always enabled
- Direct `useProfileQuery()` integration
- Immediate reactive updates when language changes

**Current Branch (Broken)**:
- Complex `useGetAppLanguageQuery(enabled: boolean)` with conditional fetching
- HTML-based initialization via `languageLoader.ts` and `window.AltinnAppData`
- `setShouldFetchAppLanguages` state management preventing reactive updates
- `useProfile()` instead of `useProfileQuery()` with different loading behavior

### URL Structure Comparison
- **Working URL**: `/instances/{instanceId}/data/{dataElementId}?language=en`
- **Broken URL**: `/instances/{instanceId}/data?language=en`

The missing data element ID in the URL means the backend cannot target the specific data element containing the label data bindings.

## Technical Deep Dive

### Current Implementation Flow
1. User selects new language in `LanguageSelector.tsx`
2. Language context updates successfully
3. Form data changes trigger `FormDataWrite.tsx`
4. System creates patches with correct `dataElementId`s in the payload
5. **BUG**: Uses `getMultiPatchUrl()` which returns `/instances/{instanceId}/data`
6. Backend receives language parameter but no specific data element ID in URL
7. Label data bindings are not refreshed for the specific data element

### Architectural Design
The codebase supports both approaches correctly:

#### Multi-Patch Endpoint (`getMultiPatchUrl`)
- **URL**: `/instances/{instanceId}/data`
- **Purpose**: Bulk operations across multiple data elements
- **Used in**: `FormDataWrite.tsx` line 98
- **Payload**: Contains `dataElementId`s in request body

#### Single Data Element Endpoint (`getDataElementIdUrl`)
- **URL**: `/instances/{instanceId}/data/{dataElementId}`
- **Purpose**: Operations on specific data elements
- **Used in**: `queries.ts` for subform deletion, attachment operations
- **Benefits**: Backend knows exactly which data element to reload

### Key Code Locations

#### FormDataWrite.tsx (lines 269-273)
```typescript
const { dataElementId } = dataModelsRef.current[dataType];
if (dataElementId && next[dataType] !== prev[dataType]) {
  const patch = createPatch({ prev: prev[dataType], next: next[dataType] });
  if (patch.length > 0) {
    patches.push({ dataElementId, patch });
  }
}
```
*Note: System correctly tracks individual data element IDs*

#### Current URL Construction (line 98)
```typescript
const multiPatchUrl = instanceId ? getMultiPatchUrl(instanceId) : undefined;
```
*Issue: Uses multi-patch URL instead of specific data element URL*

#### URL Helper Functions (appUrlHelper.ts)
```typescript
export const getMultiPatchUrl = (instanceId: string) =>
  `${appPath}/instances/${instanceId}/data`;

export const getDataElementIdUrl = (instanceId: string, dataElementId: string) =>
  `${appPath}/instances/${instanceId}/data/${dataElementId}`;
```

### Critical useEffect Breaking Changes

#### LanguageProvider.tsx Changes
**Main Branch (Working)**:
```typescript
const { data: profile, isLoading: isProfileLoading } = useProfileQuery();
const { data: appLanguages, error, isFetching } = useGetAppLanguageQuery();
const languageResolved = !isProfileLoading && !isFetching;
```

**Current Branch (Broken)**:
```typescript
const [shouldFetchAppLanguages, setShouldFetchAppLanguages] = useState<Loading<boolean>>(IsLoading);
const { data: appLanguages, error, isFetching } = useGetAppLanguageQuery(shouldFetchAppLanguages === true);
const languageResolved = !isFetching; // Missing profile loading check!
```

#### useGetAppLanguagesQuery.ts Changes
**Main Branch**: `useGetAppLanguageQuery()` - always enabled, immediate reactivity
**Current Branch**: `useGetAppLanguageQuery(enabled: boolean)` - conditional, breaks reactive updates

### The Real Issue: Conditional Query Execution
The new architecture prevents the language query from re-executing when the language changes because:
1. `shouldFetchAppLanguages` state is only set once during initialization
2. Language changes don't trigger `setShouldFetchAppLanguages(true)`
3. The query remains disabled, preventing fresh data fetches
4. Label data bindings aren't refetched with the new language parameter

### Debug Output Confirmation
Console logs confirmed:
1. Language context switches correctly (`nb` → `en`)
2. Available languages load properly
3. Patches are created with correct `dataElementId`s
4. **Primary Issue**: Query is disabled after initial load, preventing language-triggered refetches
5. **Secondary Issue**: PATCH URL lacks specific data element ID

## Solution Strategy

### Recommended Fix
For language changes affecting label data bindings, the system should:
1. Identify data elements with label data bindings
2. Use `getDataElementIdUrl()` instead of `getMultiPatchUrl()`
3. Send individual PATCH requests to specific data element endpoints
4. Include language parameter in individual requests

### Alternative Approaches
1. **Backend Enhancement**: Modify multi-patch endpoint to handle language-specific label refreshing
2. **Hybrid Approach**: Use multi-patch for data changes, single-element URLs for language changes
3. **Query Parameter Fix**: Add data element context to multi-patch language requests

## Files Involved

### Primary Files
- `src/features/formData/FormDataWrite.tsx` - Form data saving logic
- `src/utils/urls/appUrlHelper.ts` - URL construction helpers
- `src/features/language/LanguageProvider.tsx` - Language context management
- `src/components/presentation/LanguageSelector.tsx` - Language switching UI

### Supporting Files
- `src/queries/queries.ts` - API query functions
- `src/features/formData/types.ts` - Type definitions for patch requests
- Test layout: `/Users/adam.haeger/Projects/digdir/altinn-studio/src/test/apps/frontend-test/App/ui/changename/layouts/label-data-bindings.json`

## Test Impact

Several tests failed due to language-related changes:
- Snapshot mismatches from added `lang="nb"` DOM attributes
- Console warnings about undefined app languages during initial load
- DOM structure changes affecting test assertions

## Next Steps

1. **Immediate Fix**: Modify patch URL construction to use specific data element URLs for language changes
2. **Testing**: Update affected test snapshots
3. **Verification**: Test language switching with label data bindings
4. **Documentation**: Update API documentation to clarify endpoint usage patterns

## Historical Context

The system transitioned from single-element PATCH operations to multi-patch operations for performance, but the language switching logic wasn't updated to account for the specific requirements of label data binding refresh operations.