import React, { forwardRef, type JSX } from 'react';

import { useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { useLanguage } from 'src/features/language/useLanguage';
import { SigneeListDef } from 'src/layout/SigneeList/config.def.generated';
import { SigneeListComponent } from 'src/layout/SigneeList/SigneeListComponent';
import { SigneeListSummary } from 'src/layout/SigneeList/SigneeListSummary';
import { ProcessTaskType } from 'src/types';
import { NodesInternal } from 'src/utils/layout/NodesContext';
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

  renderLayoutValidators(_props: NodeValidationProps<'SigneeList'>): JSX.Element | null {
    const taskType = useTaskTypeFromBackend();
    const addError = NodesInternal.useAddError();
    const { langAsString } = useLanguage();

    if (taskType !== ProcessTaskType.Signing) {
      const error = langAsString('signing.wrong_task_error', ['SigneeList']);
      addError(error, _props.intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${_props.intermediateItem.id}': ${error}`);
    }

    return null;
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
