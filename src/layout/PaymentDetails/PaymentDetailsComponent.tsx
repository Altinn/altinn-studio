import React, { useEffect, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { FD } from 'src/features/formData/FormDataWrite';
import { useOrderDetails, useRefetchOrderDetails } from 'src/features/payment/OrderDetailsProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IPaymentDetailsProps = PropsFromGenericComponent<'PaymentDetails'>;

export function PaymentDetailsComponent({ node }: IPaymentDetailsProps) {
  const orderDetails = useOrderDetails();
  const refetchOrderDetails = useRefetchOrderDetails();
  const { title, description } = useNodeItem(node, (i) => i.textResourceBindings || {});
  const mapping = useNodeItem(node, (i) => i.mapping);
  const hasUnsavedChanges = FD.useHasUnsavedChanges();

  const mappedValues = FD.useMapping(mapping);
  const prevMappedValues = useRef<Record<string, unknown>>(mappedValues);

  // refetch data on mount by invalidating cache as the first fetch is done by the formPrefetcher
  useEffect(() => {
    refetchOrderDetails();
  }, [refetchOrderDetails]);

  useEffect(() => {
    if (!hasUnsavedChanges && mapping && !deepEqual(prevMappedValues.current, mappedValues)) {
      refetchOrderDetails();
      prevMappedValues.current = mappedValues;
    }
  }, [hasUnsavedChanges, mappedValues, mapping, refetchOrderDetails]);

  return (
    <ComponentStructureWrapper node={node}>
      <PaymentDetailsTable
        orderDetails={orderDetails}
        tableTitle={title}
        description={description}
      />
    </ComponentStructureWrapper>
  );
}
