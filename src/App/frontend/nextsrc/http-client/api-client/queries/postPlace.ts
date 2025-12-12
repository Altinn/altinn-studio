import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type PostPlaceParams = {
  zipCode: string;
};

export type PostPlaceResponse = {
  result: string;
  valid: boolean;
};

// ============================================================
// Query Key
// ============================================================

export const postPlaceKeys = {
  all: ['postPlace'] as const,
  byZipCode: (params: PostPlaceParams) => [...postPlaceKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchPostPlace(params: PostPlaceParams): Promise<PostPlaceResponse> {
  const { zipCode } = params;
  const url = 'https://api.bring.com/shippingguide/api/postalCode.json';
  const response = await axios.get<PostPlaceResponse>(url, {
    params: {
      clientUrl: window.location.href,
      pnr: zipCode,
    },
  });
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function postPlaceQueryOptions(params: PostPlaceParams | undefined) {
  return queryOptions({
    queryKey: postPlaceKeys.byZipCode(params!),
    queryFn: params ? () => fetchPostPlace(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function usePostPlaceQuery(params: PostPlaceParams | undefined) {
  return useQuery(postPlaceQueryOptions(params));
}

/** Simple data hook */
export function usePostPlace(params: PostPlaceParams | undefined) {
  const { data } = usePostPlaceQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidatePostPlace() {
  const queryClient = useQueryClient();

  return (params?: PostPlaceParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: postPlaceKeys.byZipCode(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: postPlaceKeys.all,
    });
  };
}
