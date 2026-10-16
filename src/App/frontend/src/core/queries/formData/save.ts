import { useCallback } from 'react';

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import type { AxiosRequestConfig } from 'axios';

import { getFormDataQueryKey } from 'src/core/queries/formData/formData.queries';
import { mutationResult } from 'src/core/queries/mutationResult';
import { useAppMutations } from 'src/core/queries/QueryProvider';
import { useIsStateless } from 'src/features/applicationMetadata';
import { useGetDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { FormStore } from 'src/features/form/FormContext';
import { createPatch } from 'src/features/formData/jsonPatch/createPatch';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { backendValidationIssueGroupListToObject, IgnoredValidators } from 'src/features/validation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { getMultiPatchUrl } from 'src/utils/urls/appUrlHelper';
import { getUrlWithLanguage } from 'src/utils/urls/urlHelper';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { FDSaveFinished, UpdatedDataModel } from 'src/features/formData/FormDataWriteStateMachine';
import type { IPatchListItem } from 'src/features/formData/types';

const saveFormDataMutationKey = ['saveFormData'] as const;

export function useFormDataSaveMutation() {
  const { doPostStatelessFormData, doPatchMultipleFormData } = useAppMutations();
  const getDataModelUrl = useGetDataModelUrl();
  const instanceId = useLaxInstanceId();
  const multiPatchUrl = instanceId ? getMultiPatchUrl(instanceId) : undefined;
  const currentLanguage = useAsRef(useCurrentLanguage());
  const dataModelsRef = useAsRef(FormStore.raw.useSelector((state) => state.data.models));
  const saveFinished = FormStore.raw.useSelector((s) => s.data.saveFinished);
  const cancelSave = FormStore.raw.useSelector((s) => s.data.cancelSave);
  const isStateless = useIsStateless();
  const debounce = FormStore.raw.useSelector((s) => s.data.debounce);
  const selectedPartyId = useSelectedParty()?.partyId;
  const waitFor = useWaitForState<
    { prev: { [dataType: string]: object }; next: { [dataType: string]: object } },
    FormStoreState
  >(FormStore.raw.useStore());
  const queryClient = useQueryClient();

  // This updates the query cache with the new data models every time a save has finished. This means we won't have to
  // refetch the data from the backend if the providers suddenly change (i.e. when navigating back and forth between
  // the main form and a subform).
  function updateQueryCache(result: FDSaveFinished) {
    for (const { dataType, data, dataElementId } of result.newDataModels) {
      const url = getDataModelUrl({ dataType, dataElementId });
      if (!url) {
        continue;
      }
      const queryKey = getFormDataQueryKey(url);
      queryClient.setQueryData(queryKey, data);
    }
  }

  function checkForRunawaySaving() {
    const lastRequests = queryClient
      .getMutationCache()
      .findAll({ status: 'success', mutationKey: saveFormDataMutationKey })
      .sort((a, b) => a.state.submittedAt - b.state.submittedAt)
      .map((request) => ({
        data: request.state.data,
        submittedAt: request.state.submittedAt,
      }))
      .slice(-10);

    if (lastRequests.length < 10) {
      return;
    }

    const allTheSame = lastRequests.every(
      (request, index) => index === 0 || deepEqual(request.data, lastRequests[0].data),
    );

    const hasAlternatingPattern =
      !allTheSame && lastRequests.every((request, index) => deepEqual(request.data, lastRequests[index % 2].data));

    if (!allTheSame && !hasAlternatingPattern) {
      return;
    }

    // Calculate time differences between consecutive requests
    const timeDiffs = lastRequests
      .slice(1)
      .map((request, index) => request.submittedAt - lastRequests[index].submittedAt);

    // Calculate standard deviation and mean of time differences
    const mean = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    const variance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - mean, 2), 0) / timeDiffs.length;
    const stdDev = Math.sqrt(variance);

    // Consider timing suspicious if standard deviation is low relative to the mean.
    // This suggests very regular intervals between saves (i.e. not user initiated). We purposefully don't check the
    // actual duration of a save, because that can vary a lot between apps, depending on what the backend needs
    // to do to process a save request.
    const stdDevLow = stdDev < mean * 0.3;

    if (stdDevLow) {
      const message =
        'Runaway saving detected, a bug in the application or the saving logic is causing the ' +
        'form data to save repeatedly without real changes. Check the saving requests (in the browser devtools) and ' +
        'verify the app and data model is not configured in a way that causes frontend to attempt to overwrite the ' +
        'same data as backend is sending back. If the issue persists, contact support.';

      console.error(message);
      window.logError(message);
      throw new Error(message);
    }
  }

  const mutation = useMutation({
    mutationKey: saveFormDataMutationKey,
    scope: { id: saveFormDataMutationKey[0] },
    mutationFn: async (): Promise<FDSaveFinished | undefined> => {
      const { prev, next } = await waitForDataModelChanges();

      // Don't need to save if there are no changes
      if (deepEqual(prev, next)) {
        return;
      }

      return isStateless ? saveStateless() : performMultiPatch();

      async function waitForDataModelChanges() {
        // While we could get the next model from a ref, we want to make sure we get the latest model after debounce
        // at the moment we're saving. This is especially important when automatically saving (and debouncing) when
        // navigating away from the form context.
        debounce('beforeSave');
        return await waitFor((state, setReturnValue) => {
          const dataModels = state.data.models;
          const hasUnDebouncedChanges = Object.values(dataModels).some(
            ({ debouncedCurrentData, currentData }) => debouncedCurrentData !== currentData,
          );

          if (!hasUnDebouncedChanges) {
            const next = Object.entries(dataModels).reduce((next, [dataType, { debouncedCurrentData }]) => {
              next[dataType] = debouncedCurrentData;
              return next;
            }, {});
            const prev = Object.entries(dataModels).reduce((prev, [dataType, { lastSavedData }]) => {
              prev[dataType] = lastSavedData;
              return prev;
            }, {});

            setReturnValue({ prev, next });
            return true;
          }
          return false;
        });
      }

      async function saveStateless() {
        const options: AxiosRequestConfig = {};
        if (selectedPartyId !== undefined) {
          options.headers = {
            party: `partyid:${selectedPartyId}`,
          };
        }

        // Stateless does not support multi patch, so we need to save each model independently
        const newDataModels: Promise<UpdatedDataModel>[] = [];

        for (const dataType of Object.keys(dataModelsRef.current)) {
          if (next[dataType] === prev[dataType]) {
            continue;
          }
          const url = getDataModelUrl({ dataType });
          if (!url) {
            throw new Error(`Cannot post data, url for dataType '${dataType}' could not be determined`);
          }
          newDataModels.push(
            doPostStatelessFormData(url, next[dataType], options).then((newDataModel) => ({
              dataType,
              data: newDataModel,
              dataElementId: undefined,
            })),
          );
        }

        if (newDataModels.length === 0) {
          return;
        }

        return {
          newDataModels: await Promise.all(newDataModels),
          savedData: next,
          validationIssues: undefined,
        };
      }

      async function performMultiPatch() {
        if (!multiPatchUrl) {
          throw new Error(`Cannot patch data, multipatch url could not be determined`);
        }

        const patches: IPatchListItem[] = [];

        for (const dataType of Object.keys(dataModelsRef.current)) {
          const { dataElementId } = dataModelsRef.current[dataType];
          if (dataElementId && next[dataType] !== prev[dataType]) {
            const patch = createPatch({ prev: prev[dataType], next: next[dataType] });
            if (patch.length > 0) {
              patches.push({ dataElementId, patch });
            }
          }
        }

        if (patches.length === 0) {
          return;
        }

        const { newDataModels, validationIssues, instance } = (
          await doPatchMultipleFormData(getUrlWithLanguage(multiPatchUrl, currentLanguage.current), {
            patches,
            // Ignore validations that require layout parsing in the backend which will slow down requests significantly
            ignoredValidators: IgnoredValidators,
          })
        ).data;

        const dataModelChanges: UpdatedDataModel[] = [];
        for (const { dataElementId, data } of newDataModels) {
          const dataType = Object.keys(dataModelsRef.current).find(
            (dataType) => dataModelsRef.current[dataType].dataElementId === dataElementId,
          );
          if (dataType) {
            dataModelChanges.push({ dataType, data, dataElementId });
          }
        }

        return {
          newDataModels: dataModelChanges,
          validationIssues: backendValidationIssueGroupListToObject(validationIssues),
          instance,
          savedData: next,
        };
      }
    },
    onError: () => {
      cancelSave();
    },
    onSuccess: (result) => {
      if (result) {
        updateQueryCache(result);
        saveFinished(result);
      } else {
        cancelSave();
      }
      checkForRunawaySaving();
    },
  });
  return mutationResult(mutation);
}

export function useIsSavingFormData() {
  return (
    useIsMutating({
      mutationKey: ['saveFormData'],
    }) > 0
  );
}

export function useIsSavingFormDataNow() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.isMutating({ mutationKey: saveFormDataMutationKey }) > 0, [queryClient]);
}
