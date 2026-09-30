import React, { useEffect, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { evalExpr } from 'src/features/expressions';
import { useExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import { ExprVal } from 'src/features/expressions/types';
import { FormStore } from 'src/features/form/FormContext';
import { useOrderDetails, useRefetchOrderDetails } from 'src/features/payment/OrderDetailsProvider';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
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

  const dataSources = useExpressionDataSources(refetchDependencies);
  // Dependencies are compared locally, so preserve arrays and objects instead of coercing them into query strings.
  const resolvedDependencies = useShallowMemo(
    refetchDependencies
      ? Object.entries(refetchDependencies).reduce<Record<string, unknown>>((values, [key, expr]) => {
          values[key] = evalExpr(expr, dataSources, {
            returnType: ExprVal.Any,
            defaultValue: null,
            errorIntroText: 'Invalid expression in payment refetch dependencies',
          });
          return values;
        }, {})
      : {},
  );
  const previousDependencies = useRef<Record<string, unknown> | undefined>(undefined);

  // refetch data if we have configured refetch dependencies and their values have changed
  useEffect(() => {
    if (!hasUnsavedChanges && refetchDependencies && !deepEqual(previousDependencies.current, resolvedDependencies)) {
      refetchOrderDetails();
      previousDependencies.current = resolvedDependencies;
    }
  }, [hasUnsavedChanges, refetchDependencies, resolvedDependencies, refetchOrderDetails]);

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
