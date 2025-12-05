import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type OrderDetailsParams = {
  instanceId: string;
  language?: string;
};

export type OrderDetailsResponse = {
  paymentProcessorId: string;
  currency: string;
  orderLines: Array<{
    id: string;
    name: string;
    textResourceKey?: string;
    priceExVat: number;
    quantity: number;
    vatPercent: number;
  }>;
  totalPriceExVat: number;
  totalVat: number;
  totalPriceIncVat: number;
  receiver?: {
    organisationNumber?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    bankAccountNumber?: string;
    postalAddress?: {
      name?: string;
      addressLine1?: string;
      addressLine2?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
  };
};

// ============================================================
// Query Key
// ============================================================

export const orderDetailsKeys = {
  all: ['orderDetails'] as const,
  byInstance: (params: OrderDetailsParams) => [...orderDetailsKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchOrderDetails(params: OrderDetailsParams): Promise<OrderDetailsResponse> {
  const { instanceId, language } = params;
  const languageQuery = language ? `?language=${language}` : '';
  const url = `/api/v1/instances/${instanceId}/payment/order-details${languageQuery}`;
  const response = await axios.get<OrderDetailsResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function orderDetailsQueryOptions(params: OrderDetailsParams | undefined) {
  return queryOptions({
    queryKey: orderDetailsKeys.byInstance(params!),
    queryFn: params ? () => fetchOrderDetails(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useOrderDetailsQuery(params: OrderDetailsParams | undefined) {
  return useQuery(orderDetailsQueryOptions(params));
}

/** Simple data hook */
export function useOrderDetails(params: OrderDetailsParams | undefined) {
  const { data } = useOrderDetailsQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateOrderDetails() {
  const queryClient = useQueryClient();

  return (params?: OrderDetailsParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: orderDetailsKeys.byInstance(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: orderDetailsKeys.all,
    });
  };
}
