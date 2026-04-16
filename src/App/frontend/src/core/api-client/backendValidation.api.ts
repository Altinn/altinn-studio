import { axiosInstance } from 'src/core/axiosInstance';
import { getQueryStringFromObject } from 'src/utils/urls/urlHelper';
import type { BackendValidationIssue } from 'src/features/validation';

export const backendValidationApi = {
  async fetchBackendValidations(
    instanceId: string,
    language: string,
    onlyIncrementalValidators?: boolean,
  ): Promise<BackendValidationIssue[]> {
    const queryString = getQueryStringFromObject({
      language,
      onlyIncrementalValidators: onlyIncrementalValidators?.toString(),
    });
    const { data } = await axiosInstance.get<BackendValidationIssue[]>(
      `/instances/${instanceId}/validate${queryString}`,
    );
    return data;
  },
};

export type BackendValidationApi = typeof backendValidationApi;
