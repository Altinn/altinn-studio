import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// ============================================================
// Types
// ============================================================

export type PostStatelessFormDataParams = {
  url: string;
  data: object;
  options?: AxiosRequestConfig;
};

export type PostStatelessFormDataResponse = object;

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doPostStatelessFormData(
  params: PostStatelessFormDataParams,
): Promise<PostStatelessFormDataResponse> {
  const { url, data, options } = params;
  const response = await axios.post<PostStatelessFormDataResponse>(url, data, options);
  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function usePostStatelessFormDataMutation() {
  return useMutation({
    mutationFn: doPostStatelessFormData,
  });
}

/** Simple mutation hook */
export function usePostStatelessFormData() {
  const mutation = usePostStatelessFormDataMutation();

  return async (params: PostStatelessFormDataParams): Promise<PostStatelessFormDataResponse> =>
    mutation.mutateAsync(params);
}
