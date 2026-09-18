import React, { forwardRef, type JSX } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { SigneeListDef } from 'src/layout/SigneeList/config.def.generated';
import { SigneeListComponent } from 'src/layout/SigneeList/SigneeListComponent';
import { SigneeListSummary } from 'src/layout/SigneeList/SigneeListSummary';
import { ValidateSigningTaskType } from 'src/layout/SigningActions/ValidateSigningTaskType';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class SigneeList extends SigneeListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SigneeList'>>(
    function SigneeListComponentRender(props, _): JSX.Element | null {
      return <SigneeListComponent {...props} />;
    },
  );

  renderLayoutValidators(props: ComponentLayoutValidationProps<'SigneeList'>): JSX.Element | null {
    return <ValidateSigningTaskType {...props} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    const config = useComponentConfig(targetBaseComponentId, 'SigneeList');
    const summaryTitle = useEvalExpression(
      config.textResourceBindings?.summaryTitle,
      Expressions.SigneeList.textResourceBindings.summaryTitle,
    );

    return (
      <SigneeListSummary
        targetBaseComponentId={targetBaseComponentId}
        titleOverride={config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle}
      />
    );
  }
}
