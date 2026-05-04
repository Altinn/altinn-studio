import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { SigningActionsDef } from 'src/layout/SigningActions/config.def.generated';
import { SigningActionsComponent } from 'src/layout/SigningActions/SigningActionsComponent';
import { ValidateSigningTaskType } from 'src/layout/SigningActions/ValidateSigningTaskType';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';

export class SigningActions extends SigningActionsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SigningActions'>>(
    function SigningActionsComponentRender(props, _): JSX.Element | null {
      return <SigningActionsComponent {...props} />;
    },
  );

  renderLayoutValidators(props: NodeValidationProps<'SigningActions'>): JSX.Element | null {
    return <ValidateSigningTaskType {...props} />;
  }
}
