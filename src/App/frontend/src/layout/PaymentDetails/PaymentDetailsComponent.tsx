import React, { useEffect, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useOrderDetails, useRefetchOrderDetails } from 'src/features/payment/OrderDetailsProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function PaymentDetailsComponent({ baseComponentId }: PropsFromGenericComponent<'PaymentDetails'>) {
  const orderDetails = useOrderDetails();
  const refetchOrderDetails = useRefetchOrderDetails();
  const { mapping, textResourceBindings } = useItemWhenType(baseComponentId, 'PaymentDetails');
  const { title, description } = textResourceBindings || {};
  const hasUnsavedChanges = FD.useHasUnsavedChanges();

  const mappedValues = FD.useMapping(mapping, DataModels.useDefaultDataType());
  const prevMappedValues = useRef<Record<string, unknown> | undefined>(undefined);

  // refetch data if we have configured mapping and the mapped values have changed
  useEffect(() => {
    if (!hasUnsavedChanges && mapping && !deepEqual(prevMappedValues.current, mappedValues)) {
      refetchOrderDetails();
      prevMappedValues.current = mappedValues;
    }
  }, [hasUnsavedChanges, mappedValues, mapping, refetchOrderDetails]);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <PaymentDetailsTable
        orderDetails={orderDetails}
        tableTitle={title}
        description={description}
      />
    </ComponentStructureWrapper>
  );
}
