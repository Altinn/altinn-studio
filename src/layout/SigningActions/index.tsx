import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { useLanguage } from 'src/features/language/useLanguage';
import { SigningActionsDef } from 'src/layout/SigningActions/config.def.generated';
import { SigningActionsComponent } from 'src/layout/SigningActions/SigningActionsComponent';
import { ProcessTaskType } from 'src/types';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';

export class SigningActions extends SigningActionsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SigningActions'>>(
    function SigningActionsComponentRender(props, _): JSX.Element | null {
      return <SigningActionsComponent {...props} />;
    },
  );

  renderLayoutValidators(_props: NodeValidationProps<'SigningActions'>): JSX.Element | null {
    const taskType = useTaskTypeFromBackend();
    const addError = NodesInternal.useAddError();
    const { langAsString } = useLanguage();

    if (taskType !== ProcessTaskType.Signing) {
      const error = langAsString('signing.wrong_task_error', ['SigningActions']);
      addError(error, _props.node);
      window.logErrorOnce(`Validation error for '${_props.node.id}': ${error}`);
    }

    return null;
  }
}
