import React, { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';

import { FD } from 'src/features/formData/FormDataWrite';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';
import { useOrderDetailsQuery } from 'src/layout/Payment/queries/useOrderDetailsQuery';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import type { PropsFromGenericComponent } from 'src/layout';

export type IPaymentDetailsProps = PropsFromGenericComponent<'PaymentDetails'>;

export function PaymentDetailsComponent({ node }: IPaymentDetailsProps) {
  const { partyId, instanceGuid } = useInstanceIdParams();
  const { title, description } = node.item.textResourceBindings || {};
  const mapping = node.item.mapping;
  const hasUnsavedChanges = FD.useHasUnsavedChanges();
  const queryClient = useQueryClient();

  const mappedValues = FD.useMapping(mapping);
  const prevMappedValues = useRef<Record<string, unknown>>(mappedValues);

  const { data: orderDetails } = useOrderDetailsQuery(partyId, instanceGuid);

  useEffect(() => {
    if (!hasUnsavedChanges && mapping && !deepEqual(prevMappedValues.current, mappedValues)) {
      queryClient.invalidateQueries({ queryKey: ['fetchOrderDetails'] });
      prevMappedValues.current = mappedValues;
    }
  }, [hasUnsavedChanges, queryClient, mappedValues, mapping]);

  return (
    <PaymentDetailsTable
      orderDetails={orderDetails}
      tableTitle={title}
      description={description}
    />
  );
}
