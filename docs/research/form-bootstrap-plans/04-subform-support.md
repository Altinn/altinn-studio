# Phase 4: Subform Support

## Objective

Enable the bootstrap endpoint to work with subforms by:

1. Supporting query parameters for subform layout sets and data elements
2. Updating `SubformWrapper.tsx` to use the bootstrap provider

---

## How Subforms Work

When a user opens a subform entry:

1. The main form contains a `Subform` component pointing to a layout set
2. Each subform entry is a separate data element in `instance.data`
3. When navigating to a subform, we need to load that specific layout set and data element
4. The subform gets its own `FormProvider` (nested)

**The bootstrap endpoint handles this via query parameters:**

```
?layoutSetId=subform-layout-set&dataElementId=specific-data-element-id
```

---

## Tasks

### 4.1 Update SubformWrapper

**Location**: `src/layout/Subform/SubformWrapper.tsx`

The current `SubformWrapper` creates a nested `FormProvider` with `TaskOverrides`. Update it to pass the overrides to `FormBootstrapProvider`:

```typescript
import React from 'react';
import type { PropsWithChildren } from 'react';

import { FormBootstrapProvider } from 'src/features/formBootstrap/FormBootstrapProvider';
import { FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { ValidationProvider } from 'src/features/validation/validationContext';
import { NodesProvider } from 'src/utils/layout/NodesContext';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { useNavigationParam } from 'src/hooks/navigation';
import { useItemWhenType } from 'src/layout/hooks/useItemFromNode';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';

interface SubformWrapperProps {
  baseComponentId: string;
}

export function SubformWrapper({ baseComponentId, children }: PropsWithChildren<SubformWrapperProps>) {
  // Get the data element ID from URL navigation
  const dataElementId = useNavigationParam('dataElementId');

  // Get the layout set from the Subform component configuration
  const { layoutSet } = useItemWhenType(baseComponentId, 'Subform');

  if (!layoutSet || !dataElementId) {
    return null;
  }

  return (
    <FormBootstrapProvider
      layoutSetIdOverride={layoutSet}
      dataElementIdOverride={dataElementId}
    >
      <FormDataWriteProvider>
        <ValidationProvider>
          <NodesProvider readOnly={false}>
            <PageNavigationProvider>
              {children}
            </PageNavigationProvider>
          </NodesProvider>
        </ValidationProvider>
      </FormDataWriteProvider>
    </FormBootstrapProvider>
  );
}
```

**What changed:**

- Removed `TaskOverrides` context (no longer needed)
- Passes overrides directly to `FormBootstrapProvider`
- Bootstrap endpoint handles loading the correct layout set and data element

---

### 4.2 Remove TaskOverrides Context (if no longer needed)

**Location**: `src/core/contexts/TaskOverrides.tsx`

Review if `TaskOverrides` is still needed. It previously provided:

- `taskId`
- `dataModelType`
- `dataModelElementId`
- `layoutSetId`

With bootstrap, these are determined by the query parameters. The context may no longer be necessary.

**If still needed for other purposes**, keep it but simplify.

---

### 4.3 Verify Subform Data Loading

The backend already handles subform parameters (Phase 2). Verify:

1. When `layoutSetId` is provided, it loads that layout set's layouts
2. When `dataElementId` is provided, it loads only that data element
3. The response includes correct metadata (`isSubform: true`)

---

## Backend Validation (Already Done in Phase 2)

The controller validates subform parameters:

- Both `layoutSetId` and `dataElementId` must be provided together
- Layout set must exist
- Data element must exist on the instance
- Data element type must match layout set's data type

---

## Acceptance Criteria

- [ ] Subform wrapper uses bootstrap provider with overrides
- [ ] Subform loads correct layout set
- [ ] Subform loads correct data element
- [ ] Navigation to/from subforms works
- [ ] Nested subforms work (if applicable)

---

## Notes

- The main form does NOT load subform data - it's loaded on demand when navigating
- Each subform entry is a separate data element with its own data
- Subforms can have their own static options, schemas, etc.
