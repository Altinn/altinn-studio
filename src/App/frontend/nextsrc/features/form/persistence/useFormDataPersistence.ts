import { useCallback, useEffect, useRef } from 'react';

import { compare } from 'fast-json-patch';

import { DataApi } from 'nextsrc/core/apiClient/dataApi';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';

import type { FormDataNode } from 'nextsrc/core/apiClient/dataApi';

const DEBOUNCE_TIMEOUT = 400;

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
    } catch (error) {
      // On error, keep lastSavedData unchanged so next save retries the full diff
      console.error('[useFormDataPersistence] Save failed:', error);
    } finally {
      isSavingRef.current = false;

      // If changes came in while saving, save again
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        save();
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
