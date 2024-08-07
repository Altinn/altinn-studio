import React, { useEffect, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { FD } from 'src/features/formData/FormDataWrite';
import { useOrderDetails, useRefetchOrderDetails } from 'src/features/payment/OrderDetailsProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import type { PropsFromGenericComponent } from 'src/layout';

export type IPaymentDetailsProps = PropsFromGenericComponent<'PaymentDetails'>;

export function PaymentDetailsComponent({ node }: IPaymentDetailsProps) {
  const orderDetails = useOrderDetails();
  const refetchOrderDetails = useRefetchOrderDetails();
  const { title, description } = node.item.textResourceBindings || {};
  const mapping = node.item.mapping;
  const hasUnsavedChanges = FD.useHasUnsavedChanges();

  const mappedValues = FD.useMapping(mapping);
  const prevMappedValues = useRef<Record<string, unknown>>(mappedValues);

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
