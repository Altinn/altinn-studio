import { useCallback, useEffect, useRef } from 'react';

import { compare } from 'fast-json-patch';
import { DataApi } from 'nextsrc/core/api-client/data.api';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import type { BackendValidationIssue, FormDataNode } from 'nextsrc/core/api-client/data.api';
import type { FormClient } from 'nextsrc/libs/form-client/form-client';
import type { ModelState } from 'nextsrc/libs/form-client/stores/formDataStore';
import type { FieldValidation, ValidationStore } from 'nextsrc/libs/form-client/stores/validationStore';

const DEBOUNCE_TIMEOUT = 400;

function mapSeverity(severity: number): FieldValidation['severity'] {
  switch (severity) {
    case 1:
      return 'error';
    case 2:
      return 'warning';
    default:
      return 'info';
  }
}

interface PatchEntry {
  dataElementId: string;
  patch: ReturnType<typeof compare>;
}

interface BuildPatchesResult {
  patches: PatchEntry[];
  elementIdToDataType: Map<string, string>;
}

function buildPatches(
  dirtyTypes: string[],
  models: Record<string, ModelState>,
  lastSavedData: Map<string, Record<string, FormDataNode>>,
  dataElementIds: Record<string, string>,
): BuildPatchesResult {
  const patches: PatchEntry[] = [];
  const elementIdToDataType = new Map<string, string>();

  for (const dataType of dirtyTypes) {
    const currentData = models[dataType]?.currentData;
    if (!currentData || typeof currentData !== 'object' || Array.isArray(currentData)) {
      continue;
    }

    const lastSaved = lastSavedData.get(dataType);
    if (!lastSaved) {
      continue;
    }

    const patch = compare(lastSaved, currentData as Record<string, FormDataNode>);
    if (patch.length === 0) {
      continue;
    }

    const dataElementId = dataElementIds[dataType];
    if (!dataElementId) {
      console.warn(`[useFormDataPersistence] No dataElementId mapped for dataType: ${dataType}`);
      continue;
    }

    patches.push({ dataElementId, patch });
    elementIdToDataType.set(dataElementId, dataType);
  }

  return { patches, elementIdToDataType };
}

function applyServerResponse(
  response: Awaited<ReturnType<typeof DataApi.patchFormData>>,
  elementIdToDataType: Map<string, string>,
  lastSavedData: Map<string, Record<string, FormDataNode>>,
  client: FormClient,
): void {
  for (const serverModel of response.newDataModels) {
    const dataType = elementIdToDataType.get(serverModel.dataElementId);
    if (dataType) {
      lastSavedData.set(dataType, structuredClone(serverModel.data));
      client.setFormData(serverModel.data, dataType);
    }
  }
}

function applyBackendValidations(
  response: Awaited<ReturnType<typeof DataApi.patchFormData>>,
  validationState: ValidationStore,
): void {
  validationState.clearBackend();

  const issuesBySource = response.validationIssues;
  if (!issuesBySource || typeof issuesBySource !== 'object') {
    return;
  }

  const fieldMap = new Map<string, FieldValidation[]>();

  for (const issues of Object.values(issuesBySource)) {
    if (!Array.isArray(issues)) {
      continue;
    }
    for (const issue of issues as BackendValidationIssue[]) {
      if (!issue.field) {
        continue;
      }
      const existing = fieldMap.get(issue.field) ?? [];
      existing.push({
        severity: mapSeverity(issue.severity),
        message: issue.customTextKey ?? issue.description ?? issue.code ?? 'Validation error',
      });
      fieldMap.set(issue.field, existing);
    }
  }

  for (const [field, validations] of fieldMap) {
    validationState.setFieldValidations(field, validations);
  }
}

interface UseFormDataPersistenceOptions {
  instanceOwnerPartyId: string;
  instanceGuid: string;
  dataElementIds: Record<string, string>;
}

export function useFormDataPersistence({
  instanceOwnerPartyId,
  instanceGuid,
  dataElementIds,
}: UseFormDataPersistenceOptions) {
  const client = useFormClient();
  const dataElementIdsRef = useRef(dataElementIds);
  dataElementIdsRef.current = dataElementIds;
  const lastSavedDataRef = useRef<Map<string, Record<string, FormDataNode>>>(new Map());
  const dirtyDataTypesRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    const state = client.formDataStore.getState();
    for (const [dataType, model] of Object.entries(state.models)) {
      const data = model.currentData;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        lastSavedDataRef.current.set(dataType, structuredClone(data) as Record<string, FormDataNode>);
      }
    }
  }, [client]);

  const save = useCallback(async () => {
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const dirtyTypes = [...dirtyDataTypesRef.current];
    dirtyDataTypesRef.current.clear();

    if (dirtyTypes.length === 0) {
      return;
    }

    const { patches, elementIdToDataType } = buildPatches(
      dirtyTypes,
      client.formDataStore.getState().models,
      lastSavedDataRef.current,
      dataElementIdsRef.current,
    );

    if (patches.length === 0) {
      return;
    }

    isSavingRef.current = true;
    document.body.setAttribute('data-unsaved-changes', 'true');

    try {
      const response = await DataApi.patchFormData({
        instanceOwnerPartyId,
        instanceGuid,
        request: { patches, ignoredValidators: [] },
      });

      applyServerResponse(response, elementIdToDataType, lastSavedDataRef.current, client);
      applyBackendValidations(response, client.validationStore.getState());
    } catch (error) {
      for (const dirtyType of dirtyTypes) {
        dirtyDataTypesRef.current.add(dirtyType);
      }
      console.error('[useFormDataPersistence] Save failed:', error);
    } finally {
      isSavingRef.current = false;

      const allChangesSaved = dirtyDataTypesRef.current.size === 0;

      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        await save();
      } else if (allChangesSaved) {
        document.body.removeAttribute('data-unsaved-changes');
      }
    }
  }, [client, instanceOwnerPartyId, instanceGuid]);

  useEffect(() => {
    const unsubscribe = client.onFormDataChange((event) => {
      dirtyDataTypesRef.current.add(event.dataType);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      document.body.setAttribute('data-unsaved-changes', 'true');
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        save();
      }, DEBOUNCE_TIMEOUT);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [client, save]);
}
