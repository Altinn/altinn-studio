import React, { useEffect, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { FormStore } from 'src/features/form/FormContext';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { useOrderDetails, useRefetchOrderDetails } from 'src/features/payment/OrderDetailsProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function PaymentDetailsComponent({ baseComponentId }: PropsFromGenericComponent<'PaymentDetails'>) {
  const orderDetails = useOrderDetails();
  const refetchOrderDetails = useRefetchOrderDetails();
  const { refetchDependencies, textResourceBindings } = useItemWhenType(baseComponentId, 'PaymentDetails');
  const { title, description, help } = textResourceBindings || {};
  const hasUnsavedChanges = FormStore.data.useHasUnsavedChanges();

  const resolvedDependencies = useResolvedQueryParameters(refetchDependencies);
  const previousDependencies = useRef<Record<string, unknown> | undefined>(undefined);

  // refetch data if we have configured refetch dependencies and their values have changed
  useEffect(() => {
    if (!hasUnsavedChanges && resolvedDependencies && !deepEqual(previousDependencies.current, resolvedDependencies)) {
      refetchOrderDetails();
      previousDependencies.current = resolvedDependencies;
    }
  }, [hasUnsavedChanges, resolvedDependencies, refetchOrderDetails]);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <PaymentDetailsTable
        orderDetails={orderDetails}
        tableTitle={title}
        description={description}
        help={help}
      />
    </ComponentStructureWrapper>
  );
}
