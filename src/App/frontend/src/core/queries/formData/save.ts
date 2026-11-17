import { useCallback } from 'react';

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';

import { useAppMutations } from 'src/core/queries/AppQueriesProvider';
import { getFormDataQueryKey } from 'src/core/queries/formData/formData.queries';
import { mutationResult } from 'src/core/queries/mutationResult';
import { backendValidationIssueGroupListToObject } from 'src/features/validation';
import type { FDSaveFinished, IDataModelMultiPatchRequest } from 'src/features/formData/types';

const saveFormDataMutationKey = ['saveFormData'] as const;

interface SaveModel {
  dataType: string;
  dataElementId: string | undefined;
  url: string | undefined;
}

export type FormDataSaveRequest = {
  savedData: Record<string, object>;
  models: SaveModel[];
} & (
  | { mode: 'stateless'; partyId: number | undefined }
  | { mode: 'instance'; url: string; body: IDataModelMultiPatchRequest }
);

interface FormDataSaveOptions {
  prepareSave: () => Promise<FormDataSaveRequest | undefined>;
  onSaved: (result: FDSaveFinished | undefined) => void;
  onError: () => void;
}

export function useFormDataSaveMutation({ prepareSave, onSaved, onError }: FormDataSaveOptions) {
  const { doPostStatelessFormData, doPatchMultipleFormData } = useAppMutations();
  const queryClient = useQueryClient();

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
      // Preparation runs after earlier saves settle, so it reads the latest saved state.
      const request = await prepareSave();
      if (!request) {
        return;
      }
      let result: FDSaveFinished;
      if (request.mode === 'stateless') {
        const options = request.partyId === undefined ? {} : { headers: { party: `partyid:${request.partyId}` } };
        result = {
          savedData: request.savedData,
          validationIssues: undefined,
          newDataModels: await Promise.all(
            request.models.map(async ({ dataType, url }) => {
              if (!url) {
                throw new Error(`Cannot post data, url for dataType '${dataType}' could not be determined`);
              }
              return {
                dataType,
                dataElementId: undefined,
                data: await doPostStatelessFormData(url, request.savedData[dataType], options),
              };
            }),
          ),
        };
      } else {
        const { newDataModels, validationIssues, instance } = (await doPatchMultipleFormData(request.url, request.body))
          .data;
        result = {
          savedData: request.savedData,
          instance,
          validationIssues: backendValidationIssueGroupListToObject(validationIssues),
          newDataModels: newDataModels.flatMap(({ dataElementId, data }) => {
            const model = request.models.find((model) => model.dataElementId === dataElementId);
            return model ? [{ dataType: model.dataType, dataElementId, data }] : [];
          }),
        };
      }
      // Synchronize snapshots before the feature publishes the completed save to its store.
      for (const { dataType, data } of result.newDataModels) {
        const url = request.models.find((model) => model.dataType === dataType)?.url;
        if (url) {
          queryClient.setQueryData(getFormDataQueryKey(url), data);
        }
      }
      return result;
    },
    onError,
    onSuccess: (result) => {
      onSaved(result);
      checkForRunawaySaving();
    },
  });
  return mutationResult(mutation);
}

export function useIsSavingFormData() {
  return useIsMutating({ mutationKey: saveFormDataMutationKey }) > 0;
}

export function useIsSavingFormDataNow() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.isMutating({ mutationKey: saveFormDataMutationKey }) > 0, [queryClient]);
}
