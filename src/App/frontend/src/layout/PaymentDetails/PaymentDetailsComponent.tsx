import React, { useEffect, useRef } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import deepEqual from 'fast-deep-equal';

import { evalExpr } from 'src/features/expressions';
import { useExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import { ExprVal } from 'src/features/expressions/types';
import { FormStore } from 'src/features/form/FormContext';
import { useOrderDetails, useRefetchOrderDetails } from 'src/features/payment/OrderDetailsProvider';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function PaymentDetailsComponent({ baseComponentId }: PropsFromGenericComponent<'PaymentDetails'>) {
  const orderDetails = useOrderDetails();
  const refetchOrderDetails = useRefetchOrderDetails();
  const config = useComponentConfig(baseComponentId, 'PaymentDetails');
  const title = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.PaymentDetails.textResourceBindings.title,
  );
  const description = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.PaymentDetails.textResourceBindings.description,
  );
  const help = useEvalExpression(
    config.textResourceBindings?.help,
    Expressions.PaymentDetails.textResourceBindings.help,
  );

  const hasUnsavedChanges = FormStore.data.useHasUnsavedChanges();

  const dataSources = useExpressionDataSources(config.refetchDependencies);
  // Dependencies are compared locally, so preserve arrays and objects instead of coercing them into query strings.
  const resolvedDependencies = useShallowMemo(
    config.refetchDependencies
      ? Object.entries(config.refetchDependencies).reduce<Record<string, unknown>>((values, [key, expr]) => {
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
    if (
      !hasUnsavedChanges &&
      config.refetchDependencies &&
      !deepEqual(previousDependencies.current, resolvedDependencies)
    ) {
      refetchOrderDetails();
      previousDependencies.current = resolvedDependencies;
    }
  }, [hasUnsavedChanges, config.refetchDependencies, resolvedDependencies, refetchOrderDetails]);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <PaymentDetailsTable
        orderDetails={orderDetails}
        tableTitle={config.textResourceBindings?.title === undefined ? undefined : title}
        description={config.textResourceBindings?.description === undefined ? undefined : description}
        help={config.textResourceBindings?.help === undefined ? undefined : help}
      />
    </ComponentStructureWrapper>
  );
}
