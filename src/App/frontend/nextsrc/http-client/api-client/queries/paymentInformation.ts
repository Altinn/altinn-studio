import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type PaymentInformationParams = {
  instanceId: string;
  language?: string;
};

export type PaymentInformationResponse = {
  taskId: string;
  status: string;
  orderDetails?: {
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
  paymentDetails?: {
    paymentId: string;
    redirectUrl?: string;
    receiptUrl?: string;
    payer?: {
      privatePerson?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: {
          prefix?: string;
          number?: string;
        };
      };
      company?: {
        name?: string;
        organisationNumber?: string;
      };
      shippingAddress?: {
        name?: string;
        addressLine1?: string;
        addressLine2?: string;
        postalCode?: string;
        city?: string;
        country?: string;
      };
      billingAddress?: {
        name?: string;
        addressLine1?: string;
        addressLine2?: string;
        postalCode?: string;
        city?: string;
        country?: string;
      };
    };
    cardDetails?: {
      maskedPan?: string;
      expiryDate?: string;
    };
    invoiceDetails?: {
      invoiceNumber?: string;
      dueDate?: string;
    };
  };
};

// ============================================================
// Query Key
// ============================================================

export const paymentInformationKeys = {
  all: ['paymentInformation'] as const,
  byInstance: (params: PaymentInformationParams) => [...paymentInformationKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchPaymentInformation(params: PaymentInformationParams): Promise<PaymentInformationResponse> {
  const { instanceId, language } = params;
  const languageQuery = language ? `?language=${language}` : '';
  const url = `/api/v1/instances/${instanceId}/payment${languageQuery}`;
  const response = await apiClient.get<PaymentInformationResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function paymentInformationQueryOptions(params: PaymentInformationParams | undefined) {
  return queryOptions({
    queryKey: paymentInformationKeys.byInstance(params!),
    queryFn: params ? () => fetchPaymentInformation(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function usePaymentInformationQuery(params: PaymentInformationParams | undefined) {
  return useQuery(paymentInformationQueryOptions(params));
}

/** Simple data hook */
export function usePaymentInformation(params: PaymentInformationParams | undefined) {
  const { data } = usePaymentInformationQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidatePaymentInformation() {
  const queryClient = useQueryClient();

  return (params?: PaymentInformationParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: paymentInformationKeys.byInstance(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: paymentInformationKeys.all,
    });
  };
}
