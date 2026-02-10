# Phase 3: Frontend Provider

## Objective

This is the main frontend refactor. We will:

1. Create a new simple `FormBootstrapProvider`
2. Replace the complex nested provider hierarchy
3. Delete old providers and queries
4. Update any consumers of deleted hooks

---

## What Gets Deleted

| File                                                        | Why                   |
| ----------------------------------------------------------- | --------------------- |
| `src/features/datamodel/DataModelsProvider.tsx`             | Replaced by bootstrap |
| `src/features/options/CodeListsProvider.tsx`                | Replaced by bootstrap |
| `src/queries/formPrefetcher.ts`                             | No longer needed      |
| `src/features/datamodel/useDataModelSchemaQuery.ts`         | Schema from bootstrap |
| `src/features/customValidation/useCustomValidationQuery.ts` | Config from bootstrap |

---

## Tasks

### 3.1 Create Response Types

**Location**: `src/features/formBootstrap/types.ts`

```typescript
import type { JSONSchema7 } from 'json-schema';
import type { IExpressionValidations } from 'src/features/validation';
import type { ILayouts } from 'src/layout/layout';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { ValidationIssueWithSource } from 'src/features/validation';

export interface DataModelInfo {
  schema: JSONSchema7;
  initialData: object;
  dataElementId: string | null;
  isWritable: boolean;
  expressionValidationConfig: IExpressionValidations | null;
}

export interface FormBootstrapMetadata {
  layoutSetId: string;
  defaultDataType: string;
  isSubform: boolean;
  isPdf: boolean;
}

export interface FormBootstrapResponse {
  layouts: ILayouts;
  layoutSettings: ProcessedLayoutSettings;
  dataModels: Record<string, DataModelInfo>;
  staticOptions: Record<string, IOptionInternal[]>;
  validationIssues: ValidationIssueWithSource[] | null;
  metadata: FormBootstrapMetadata;
}

// Re-export or define ProcessedLayoutSettings if needed
export interface ProcessedLayoutSettings {
  order: string[];
  groups?: NavigationPageGroup[];
  pageSettings: Partial<GlobalPageSettings>;
  pdfLayoutName?: string;
}
```

---

### 3.2 Create Query Hook

**Location**: `src/features/formBootstrap/useFormBootstrapQuery.ts`

```typescript
import { useQuery, skipToken } from '@tanstack/react-query';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getFormBootstrapUrl, getStatelessFormBootstrapUrl } from 'src/utils/urls/appUrlHelper';
import { useIsStateless } from 'src/features/applicationMetadata';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLayoutSetIdFromUrl } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsPdf } from 'src/hooks/useIsPdf';
import type { FormBootstrapResponse } from './types';

export interface FormBootstrapQueryOptions {
  layoutSetIdOverride?: string;
  dataElementIdOverride?: string;
}

export function useFormBootstrapQuery(options?: FormBootstrapQueryOptions) {
  const isStateless = useIsStateless();
  const instanceId = useLaxInstanceId();
  const layoutSetId = useLayoutSetIdFromUrl();
  const language = useCurrentLanguage();
  const isPdf = useIsPdf();

  // Use override if provided, otherwise use current layout set
  const effectiveLayoutSetId = options?.layoutSetIdOverride ?? layoutSetId;

  const enabled = isStateless ? !!effectiveLayoutSetId : !!instanceId;

  return useQuery({
    queryKey: [
      'formBootstrap',
      isStateless ? 'stateless' : 'instance',
      isStateless ? effectiveLayoutSetId : instanceId,
      options?.layoutSetIdOverride,
      options?.dataElementIdOverride,
      isPdf,
      language,
    ],
    queryFn: enabled
      ? async () => {
          const url = isStateless
            ? getStatelessFormBootstrapUrl(effectiveLayoutSetId!, { language })
            : getFormBootstrapUrl(instanceId!, {
                layoutSetId: options?.layoutSetIdOverride,
                dataElementId: options?.dataElementIdOverride,
                pdf: isPdf,
                language,
              });

          return httpGet<FormBootstrapResponse>(url);
        }
      : skipToken,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}
```

---

### 3.3 Create Bootstrap Provider

**Location**: `src/features/formBootstrap/FormBootstrapProvider.tsx`

This provider fetches bootstrap data and provides it to consumers. It replaces the complex zustand stores with simple React context.

```typescript
import React, { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { useFormBootstrapQuery } from './useFormBootstrapQuery';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';
import type { FormBootstrapResponse, DataModelInfo } from './types';
import type { ILayouts } from 'src/layout/layout';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IExpressionValidations } from 'src/features/validation';

interface FormBootstrapContextValue {
  // Layouts
  layouts: ILayouts;
  layoutSettings: FormBootstrapResponse['layoutSettings'];

  // Data models
  dataModels: Record<string, DataModelInfo>;
  defaultDataType: string;
  allDataTypes: string[];
  writableDataTypes: string[];

  // Static options
  staticOptions: Record<string, IOptionInternal[]>;

  // Initial validation
  initialValidationIssues: FormBootstrapResponse['validationIssues'];

  // Metadata
  metadata: FormBootstrapResponse['metadata'];

  // Helpers
  getSchema: (dataType: string) => JSONSchema7 | undefined;
  getInitialData: (dataType: string) => object | undefined;
  getDataElementId: (dataType: string) => string | null | undefined;
  getExpressionValidationConfig: (dataType: string) => IExpressionValidations | null | undefined;
  getStaticOptions: (optionsId: string) => IOptionInternal[] | undefined;
}

const FormBootstrapContext = createContext<FormBootstrapContextValue | null>(null);

interface FormBootstrapProviderProps {
  layoutSetIdOverride?: string;
  dataElementIdOverride?: string;
}

export function FormBootstrapProvider({
  children,
  layoutSetIdOverride,
  dataElementIdOverride,
}: PropsWithChildren<FormBootstrapProviderProps>) {
  const { data, isLoading, error, isError } = useFormBootstrapQuery({
    layoutSetIdOverride,
    dataElementIdOverride,
  });

  const contextValue = useMemo<FormBootstrapContextValue | null>(() => {
    if (!data) return null;

    const allDataTypes = Object.keys(data.dataModels);
    const writableDataTypes = allDataTypes.filter(dt => data.dataModels[dt].isWritable);

    return {
      layouts: data.layouts,
      layoutSettings: data.layoutSettings,
      dataModels: data.dataModels,
      defaultDataType: data.metadata.defaultDataType,
      allDataTypes,
      writableDataTypes,
      staticOptions: data.staticOptions,
      initialValidationIssues: data.validationIssues,
      metadata: data.metadata,

      // Helpers
      getSchema: (dataType) => data.dataModels[dataType]?.schema,
      getInitialData: (dataType) => data.dataModels[dataType]?.initialData,
      getDataElementId: (dataType) => data.dataModels[dataType]?.dataElementId,
      getExpressionValidationConfig: (dataType) => data.dataModels[dataType]?.expressionValidationConfig,
      getStaticOptions: (optionsId) => data.staticOptions[optionsId],
    };
  }, [data]);

  if (isLoading) {
    return <Loader reason="form-bootstrap" />;
  }

  if (isError || !contextValue) {
    if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }
    return <DisplayError error={error ?? new Error('Failed to load form data')} />;
  }

  return (
    <FormBootstrapContext.Provider value={contextValue}>
      {children}
    </FormBootstrapContext.Provider>
  );
}

// Hook to get the full context
export function useFormBootstrap(): FormBootstrapContextValue {
  const ctx = useContext(FormBootstrapContext);
  if (!ctx) {
    throw new Error('useFormBootstrap must be used within FormBootstrapProvider');
  }
  return ctx;
}

// Convenience hooks that mirror the old DataModels API
export const FormBootstrap = {
  useLayouts: () => useFormBootstrap().layouts,
  useLayoutSettings: () => useFormBootstrap().layoutSettings,

  useDefaultDataType: () => useFormBootstrap().defaultDataType,
  useReadableDataTypes: () => useFormBootstrap().allDataTypes,
  useWritableDataTypes: () => useFormBootstrap().writableDataTypes,

  useSchema: (dataType: string) => useFormBootstrap().getSchema(dataType),
  useInitialData: (dataType: string) => useFormBootstrap().getInitialData(dataType),
  useDataElementId: (dataType: string) => useFormBootstrap().getDataElementId(dataType),
  useExpressionValidationConfig: (dataType: string) => useFormBootstrap().getExpressionValidationConfig(dataType),

  useStaticOptions: (optionsId: string) => useFormBootstrap().getStaticOptions(optionsId),

  useInitialValidationIssues: () => useFormBootstrap().initialValidationIssues,
};
```

---

### 3.4 Update FormContext.tsx

**Location**: `src/features/form/FormContext.tsx`

Replace the complex nested hierarchy with the new simple structure:

```typescript
import React from 'react';
import type { PropsWithChildren } from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { FormBootstrapProvider } from 'src/features/formBootstrap/FormBootstrapProvider';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { ValidationProvider } from 'src/features/validation/validationContext';
import { NodesProvider } from 'src/utils/layout/NodesContext';
import { PaymentInformationProvider } from 'src/features/payment/PaymentInformationProvider';
import { OrderDetailsProvider } from 'src/features/payment/OrderDetailsProvider';
import { PaymentProvider } from 'src/features/payment/PaymentProvider';
import { useNavigationParam } from 'src/hooks/navigation';

export interface FormContext {
  readOnly?: boolean;
}

const { Provider, useLaxCtx } = createContext<FormContext>({
  name: 'Form',
  required: true,
});

export function useIsInFormContext() {
  return useLaxCtx() !== ContextNotProvided;
}

/**
 * Simplified FormProvider using the bootstrap endpoint.
 * This replaces the previous 10+ nested providers with a flat structure.
 */
export function FormProvider({ children, readOnly = false }: PropsWithChildren<FormContext>) {
  const isEmbedded = useIsInFormContext();
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const hasProcess = !!(instanceOwnerPartyId && instanceGuid);

  return (
    <FormBootstrapProvider>
      <FormDataWriteProvider>
        <ValidationProvider>
          <NodesProvider readOnly={readOnly} isEmbedded={isEmbedded}>
            <PageNavigationProvider>
              <PaymentInformationProvider>
                <OrderDetailsProvider>
                  <MaybePaymentProvider hasProcess={hasProcess}>
                    <Provider value={{ readOnly }}>
                      {children}
                    </Provider>
                  </MaybePaymentProvider>
                </OrderDetailsProvider>
              </PaymentInformationProvider>
            </PageNavigationProvider>
          </NodesProvider>
        </ValidationProvider>
      </FormDataWriteProvider>
    </FormBootstrapProvider>
  );
}

function MaybePaymentProvider({ children, hasProcess }: PropsWithChildren<{ hasProcess: boolean }>) {
  if (hasProcess) {
    return <PaymentProvider>{children}</PaymentProvider>;
  }
  return children;
}
```

**What changed:**

- Removed `LoadingRegistryProvider` (bootstrap handles loading)
- Removed `FormPrefetcher` (no longer needed)
- Removed `LayoutsProvider` (layouts from bootstrap)
- Removed `CodeListsProvider` (options from bootstrap)
- Removed `DataModelsProvider` (data from bootstrap)
- Removed `LayoutSettingsProvider` (settings from bootstrap)
- Removed `BlockUntilAllLoaded` (bootstrap blocks until ready)

---

### 3.5 Update Consumers

Files that import from deleted modules need updating. Search for:

```
grep -r "from 'src/features/datamodel/DataModelsProvider'" src/
grep -r "from 'src/features/options/CodeListsProvider'" src/
grep -r "DataModels\." src/
```

**Common patterns to update:**

```typescript
// OLD
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
const schema = DataModels.useDataModelSchema(dataType);

// NEW
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
const schema = FormBootstrap.useSchema(dataType);
```

```typescript
// OLD
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
const layouts = useLayouts();

// NEW
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
const layouts = FormBootstrap.useLayouts();
```

---

### 3.6 Update ValidationProvider

The `ValidationProvider` needs to receive initial validation issues from bootstrap:

```typescript
// In ValidationProvider, add support for initial issues
export function ValidationProvider({ children }: PropsWithChildren) {
  const { initialValidationIssues } = useFormBootstrap();

  // Use initialValidationIssues as the starting state
  // instead of fetching separately
}
```

---

### 3.7 Update FormDataWriteProvider

The `FormDataWriteProvider` needs initial data from bootstrap:

```typescript
// In FormDataWriteProvider
export function FormDataWriteProvider({ children }: PropsWithChildren) {
  const { dataModels, defaultDataType } = useFormBootstrap();

  // Initialize form data state from bootstrap response
  // instead of fetching separately
}
```

---

### 3.8 Delete Old Files

After everything is working, delete:

```bash
rm src/features/datamodel/DataModelsProvider.tsx
rm src/features/options/CodeListsProvider.tsx
rm src/queries/formPrefetcher.ts
# Review and potentially delete or simplify:
rm src/features/datamodel/useDataModelSchemaQuery.ts
rm src/features/formData/useFormDataQuery.ts  # if no longer used for initial load
```

---

## Files to Delete

| File                           | Status                          |
| ------------------------------ | ------------------------------- |
| `DataModelsProvider.tsx`       | DELETE                          |
| `CodeListsProvider.tsx`        | DELETE                          |
| `formPrefetcher.ts`            | DELETE                          |
| `useDataModelSchemaQuery.ts`   | DELETE (or keep for other uses) |
| `DataElementIdsForCypress.tsx` | Review - may need updating      |

---

## Files to Modify

| File                           | Changes                                  |
| ------------------------------ | ---------------------------------------- |
| `FormContext.tsx`              | Major rewrite - simplified provider tree |
| `ValidationProvider.tsx`       | Use bootstrap initial validation         |
| `FormDataWriteProvider.tsx`    | Use bootstrap initial data               |
| `LayoutsContext.tsx`           | May become a simple re-export            |
| `LayoutSettingsContext.tsx`    | May become a simple re-export            |
| All files using `DataModels.*` | Update imports                           |
| All files using `useLayouts`   | Update imports if source changed         |

---

## Acceptance Criteria

- [ ] Bootstrap provider fetches and provides all form data
- [ ] Form renders correctly with new provider structure
- [ ] Old providers are deleted
- [ ] No regressions in form functionality
- [ ] Code compiles without errors
- [ ] At least 800 lines of code removed

---

## Notes

- This is the biggest phase - take it step by step
- Keep old code around initially, switch to new, then delete
- Focus on getting it working first, then clean up
- Some utility functions in old files may still be useful - extract if needed
