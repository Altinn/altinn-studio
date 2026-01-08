# React Query HTTP Client Specification

## Overview

Refactor `src/http-client/queries.ts` into a modular, layered HTTP client:

1. **Pure HTTP Layer**: Framework-agnostic HTTP functions using axios directly (no app utilities)
2. **React Query Layer**: Hooks for caching, invalidation, and state management

```
┌─────────────────────────────────┐
│  React Query Hooks              │  ← useXxxQuery(), useXxxMutation()
│  (caching, invalidation, state) │
├─────────────────────────────────┤
│  Pure HTTP Layer                │  ← fetchXxx(), doXxx() - EXPORTED
│  (axios only, no app utilities) │
└─────────────────────────────────┘
```

**Key Principle**: The HTTP layer uses only `axios` - no imports from `src/utils/`, `src/features/`, etc.

---

## Directory Structure

```
src/http-client/
├── api-client/
│   ├── queries/
│   │   ├── instanceData.ts
│   │   ├── applicationMetadata.ts
│   │   └── ...
│   ├── mutations/
│   │   ├── setSelectedParty.ts
│   │   ├── attachmentUpload.ts
│   │   └── ...
│   └── index.ts
└── MIGRATION.md
```

---

## Query File Template

### Example: `queries/instanceData.ts`

```typescript
import axios from 'axios';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { skipToken } from '@tanstack/react-query';

// ============================================================
// Types
// ============================================================

export type InstanceDataParams = {
  instanceOwnerPartyId: string;
  instanceGuid: string;
};

export type InstanceDataResponse = {
  id: string;
  instanceOwner: { partyId: string };
  appId: string;
  org: string;
  data: Array<{ id: string; dataType: string }>;
};

// ============================================================
// Query Key
// ============================================================

export const instanceDataKeys = {
  all: ['instanceData'] as const,
  detail: (params: InstanceDataParams) => [...instanceDataKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchInstanceData(
  params: InstanceDataParams
): Promise<InstanceDataResponse> {
  const { instanceOwnerPartyId, instanceGuid } = params;
  const url = `/instances/${instanceOwnerPartyId}/${instanceGuid}`;
  const response = await axios.get<InstanceDataResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function instanceDataQueryOptions(params: InstanceDataParams | undefined) {
  return queryOptions({
    queryKey: instanceDataKeys.detail(params!),
    queryFn: params ? () => fetchInstanceData(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook - returns query state (data, isLoading, error, etc.) */
export function useInstanceDataQuery(params: InstanceDataParams | undefined) {
  return useQuery(instanceDataQueryOptions(params));
}

/** Simple data hook - just returns the data or undefined */
export function useInstanceData(params: InstanceDataParams | undefined) {
  const { data } = useInstanceDataQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateInstanceData() {
  const queryClient = useQueryClient();

  return (params?: InstanceDataParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: instanceDataKeys.detail(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: instanceDataKeys.all,
    });
  };
}
```

### Example: `queries/applicationMetadata.ts` (no params)

```typescript
import axios from 'axios';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================
// Types
// ============================================================

export type ApplicationMetadataResponse = {
  id: string;
  org: string;
  title: Record<string, string>;
  dataTypes: Array<{ id: string; allowedContentTypes: string[] }>;
};

// ============================================================
// Query Key
// ============================================================

export const applicationMetadataKeys = {
  all: ['applicationMetadata'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchApplicationMetadata(): Promise<ApplicationMetadataResponse> {
  const url = '/api/v1/applicationmetadata';
  const response = await axios.get<ApplicationMetadataResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function applicationMetadataQueryOptions() {
  return queryOptions({
    queryKey: applicationMetadataKeys.all,
    queryFn: fetchApplicationMetadata,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useApplicationMetadataQuery() {
  return useQuery(applicationMetadataQueryOptions());
}

/** Simple data hook */
export function useApplicationMetadata() {
  const { data } = useApplicationMetadataQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateApplicationMetadata() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: applicationMetadataKeys.all,
    });
}
```

---

## Mutation File Template

### Example: `mutations/attachmentUpload.ts`

```typescript
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';

// ============================================================
// Types
// ============================================================

export type AttachmentUploadParams = {
  instanceId: string;
  dataTypeId: string;
  language: string;
  file: File;
  contentType: string;
};

export type AttachmentUploadResponse = {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename: string;
  contentType: string;
  size: number;
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doAttachmentUpload(
  params: AttachmentUploadParams
): Promise<AttachmentUploadResponse> {
  const { instanceId, dataTypeId, language, file, contentType } = params;
  const url = `/instances/${instanceId}/data?dataType=${dataTypeId}&language=${language}`;

  const response = await axios.post<AttachmentUploadResponse>(url, file, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  });

  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useAttachmentUploadMutation() {
  return useMutation({
    mutationFn: doAttachmentUpload,
  });
}

/** Simple mutation hook - returns async function that abstracts React Query */
export function useAttachmentUpload() {
  const mutation = useAttachmentUploadMutation();

  return async (params: AttachmentUploadParams): Promise<AttachmentUploadResponse> => {
    return mutation.mutateAsync(params);
  };
}
```

### Example: `mutations/setSelectedParty.ts` (with invalidation)

```typescript
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================
// Types
// ============================================================

export type SetSelectedPartyParams = {
  partyId: number | string;
};

export type SetSelectedPartyResponse = string | null;

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doSetSelectedParty(
  params: SetSelectedPartyParams
): Promise<SetSelectedPartyResponse> {
  const { partyId } = params;
  const url = `/api/v1/parties/${partyId}`;
  const response = await axios.put<SetSelectedPartyResponse>(url);
  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useSetSelectedPartyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: doSetSelectedParty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selectedParty'] });
    },
  });
}

/** Simple mutation hook - returns async function that abstracts React Query */
export function useSetSelectedParty() {
  const mutation = useSetSelectedPartyMutation();

  return async (params: SetSelectedPartyParams): Promise<SetSelectedPartyResponse> => {
    return mutation.mutateAsync(params);
  };
}
```

---

## Design Principles

1. **Pure HTTP Layer**: Only `axios` - no imports from `src/utils/`, `src/features/`, etc.
2. **Self-contained files**: Each file has its own types, no shared type imports
3. **URLs built inline**: No URL helper functions, URLs are template strings
4. **No data transformations**: HTTP functions return raw API responses
5. **Object params**: All functions take a single params object for consistency
6. **No mutation keys**: Mutation keys are optional, omit unless needed for deduplication

---

## File Exports Summary

### Query Files

```typescript
export type XxxParams = { ... };
export type XxxResponse = { ... };
export const xxxKeys = { all, detail };
export async function fetchXxx(params): Promise<Response>
export function xxxQueryOptions(params | undefined)
export function useXxxQuery(params): UseQueryResult<Response>
export function useXxx(params): Response | undefined
export function useInvalidateXxx(): () => Promise<void>
```

### Mutation Files

```typescript
export type XxxParams = { ... };
export type XxxResponse = { ... };
export async function doXxx(params): Promise<Response>
export function useXxxMutation(): UseMutationResult
export function useXxx(): (params) => Promise<Response>
```

---

## Progress Checklist

### Queries

| Done | File | Params |
|------|------|--------|
| [ ] | `queries/logo.ts` | none |
| [ ] | `queries/activeInstances.ts` | `{ partyId }` |
| [ ] | `queries/instanceData.ts` | `{ partyId, instanceGuid }` |
| [ ] | `queries/processState.ts` | `{ instanceId }` |
| [ ] | `queries/applicationMetadata.ts` | none |
| [ ] | `queries/applicationSettings.ts` | none |
| [ ] | `queries/selectedParty.ts` | none |
| [ ] | `queries/footerLayout.ts` | none |
| [ ] | `queries/layoutSets.ts` | none |
| [ ] | `queries/layouts.ts` | `{ layoutSetId }` |
| [ ] | `queries/layoutSettings.ts` | `{ layoutSetId }` |
| [ ] | `queries/options.ts` | `{ url }` |
| [ ] | `queries/dataList.ts` | `{ url }` |
| [ ] | `queries/orgs.ts` | none |
| [ ] | `queries/partiesAllowedToInstantiate.ts` | none |
| [ ] | `queries/appLanguages.ts` | none |
| [ ] | `queries/returnUrl.ts` | `{ returnUrl }` |
| [ ] | `queries/refreshJwtToken.ts` | none |
| [ ] | `queries/customValidationConfig.ts` | `{ dataTypeId }` |
| [ ] | `queries/userProfile.ts` | none |
| [ ] | `queries/dataModelSchema.ts` | `{ dataTypeName }` |
| [ ] | `queries/formData.ts` | `{ url }` |
| [ ] | `queries/pdfFormat.ts` | `{ instanceId, dataElementId }` |
| [ ] | `queries/dynamics.ts` | `{ layoutSetId }` |
| [ ] | `queries/ruleHandler.ts` | `{ layoutSetId }` |
| [ ] | `queries/textResources.ts` | `{ language }` |
| [ ] | `queries/paymentInformation.ts` | `{ instanceId, language? }` |
| [ ] | `queries/orderDetails.ts` | `{ instanceId, language? }` |
| [ ] | `queries/backendValidations.ts` | `{ instanceId, language, onlyIncremental? }` |
| [ ] | `queries/layoutSchema.ts` | none |
| [ ] | `queries/postPlace.ts` | `{ zipCode }` |
| [ ] | `queries/externalApi.ts` | `{ instanceId, externalApiId }` |

### Mutations

| Done | File | Params |
|------|------|--------|
| [ ] | `mutations/setSelectedParty.ts` | `{ partyId }` |
| [ ] | `mutations/instantiateWithPrefill.ts` | `{ data, language? }` |
| [ ] | `mutations/instantiate.ts` | `{ partyId, language? }` |
| [ ] | `mutations/processNext.ts` | `{ instanceId, language?, action? }` |
| [ ] | `mutations/attachmentUpload.ts` | `{ instanceId, dataTypeId, language, file, contentType }` |
| [ ] | `mutations/updateAttachmentTags.ts` | `{ instanceId, dataElementId, tags }` |
| [ ] | `mutations/performAction.ts` | `{ partyId, instanceGuid, action, language }` |
| [ ] | `mutations/attachmentRemove.ts` | `{ instanceId, dataElementId, language }` |
| [ ] | `mutations/subformEntryAdd.ts` | `{ instanceId, dataType, data }` |
| [ ] | `mutations/subformEntryDelete.ts` | `{ instanceId, dataElementId }` |
| [ ] | `mutations/patchMultipleFormData.ts` | `{ url, data }` |
| [ ] | `mutations/postStatelessFormData.ts` | `{ url, data }` |