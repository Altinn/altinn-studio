import React, { forwardRef, type JSX } from 'react';

import { SigneeListDef } from 'src/layout/SigneeList/config.def.generated';
import { SigneeListComponent } from 'src/layout/SigneeList/SigneeListComponent';
import { SigneeListSummary } from 'src/layout/SigneeList/SigneeListSummary';
import { ValidateSigningTaskType } from 'src/layout/SigningActions/ValidateSigningTaskType';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class SigneeList extends SigneeListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SigneeList'>>(
    function SigneeListComponentRender(props, _): JSX.Element | null {
      return <SigneeListComponent {...props} />;
    },
  );

  renderLayoutValidators(props: NodeValidationProps<'SigneeList'>): JSX.Element | null {
    return <ValidateSigningTaskType {...props} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    const { textResourceBindings } = useItemWhenType(targetBaseComponentId, 'SigneeList');

    return (
      <SigneeListSummary
        targetBaseComponentId={targetBaseComponentId}
        titleOverride={textResourceBindings?.summaryTitle}
      />
    );
  }
}
