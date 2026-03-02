import { useCallback, useEffect, useRef } from 'react';

import { compare } from 'fast-json-patch';
import { DataApi } from 'nextsrc/core/api-client/data.api';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import type { BackendValidationIssue, FormDataNode } from 'nextsrc/core/api-client/data.api';
import type { FieldValidation } from 'nextsrc/libs/form-client/stores/validationStore';

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

interface UseFormDataPersistenceOptions {
  instanceOwnerPartyId: string;
  instanceGuid: string;
  dataElementId: string;
}

export function useFormDataPersistence({
  instanceOwnerPartyId,
  instanceGuid,
  dataElementId,
}: UseFormDataPersistenceOptions) {
  const client = useFormClient();
  const lastSavedDataRef = useRef<Record<string, FormDataNode> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  // Initialize lastSavedData from the current form data (which was just fetched from the server)
  useEffect(() => {
    const currentData = client.formDataStore.getState().data;
    if (currentData && typeof currentData === 'object' && !Array.isArray(currentData)) {
      lastSavedDataRef.current = structuredClone(currentData) as Record<string, FormDataNode>;
    }
  }, [client]);

  const save = useCallback(async () => {
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const currentData = client.formDataStore.getState().data;
    if (!currentData || typeof currentData !== 'object' || Array.isArray(currentData)) {
      return;
    }

    const lastSaved = lastSavedDataRef.current;
    if (!lastSaved) {
      return;
    }

    const patch = compare(lastSaved, currentData as Record<string, FormDataNode>);
    if (patch.length === 0) {
      return;
    }

    isSavingRef.current = true;
    document.body.setAttribute('data-unsaved-changes', 'true');

    try {
      const response = await DataApi.patchFormData({
        instanceOwnerPartyId,
        instanceGuid,
        request: {
          patches: [{ dataElementId, patch }],
          ignoredValidators: [],
        },
      });

      // Update lastSavedData to server-returned data
      const serverData = response.newDataModels.find((m) => m.dataElementId === dataElementId);
      if (serverData) {
        lastSavedDataRef.current = structuredClone(serverData.data);
        // Feed server-calculated values back into form client
        // setFormData uses setData which does NOT trigger onChange callbacks
        client.setFormData(serverData.data);
      } else {
        // No server data returned — assume our current data is the saved state
        lastSavedDataRef.current = structuredClone(currentData) as Record<string, FormDataNode>;
      }

      // Feed validation issues into the validation store
      // Only clear backend validation keys (not client-side ones like :__required)
      const validationState = client.validationStore.getState();
      validationState.clearBackend();

      const issuesBySource = response.validationIssues;
      if (issuesBySource && typeof issuesBySource === 'object') {
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
    } catch (error) {
      // On error, keep lastSavedData unchanged so next save retries the full diff
      console.error('[useFormDataPersistence] Save failed:', error);
    } finally {
      isSavingRef.current = false;

      // If changes came in while saving, save again
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        save();
      } else {
        document.body.removeAttribute('data-unsaved-changes');
      }
    }
  }, [client, instanceOwnerPartyId, instanceGuid, dataElementId]);

  useEffect(() => {
    const unsubscribe = client.onFormDataChange(() => {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Start a new debounce timer
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
