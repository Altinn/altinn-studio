import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { LommebokDef } from 'src/layout/Lommebok/config.def.generated';
import { LommebokComponent } from 'src/layout/Lommebok/LommebokComponent';
import { LommebokValidator } from 'src/layout/Lommebok/LommebokValidator';
import { validateLommebokForNode } from 'src/layout/Lommebok/validateLommebok';
import type { AnyValidation } from 'src/features/validation';
import type { ComponentValidationContext, PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export class Lommebok extends LommebokDef implements ValidateComponent<'Lommebok'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Lommebok'>>(
    function LayoutComponentLommebokRender(props, _): JSX.Element | null {
      return <LommebokComponent {...props} />;
    },
  );

  renderSummary(_props: SummaryRendererProps): JSX.Element | null {
    return null;
  }

  validateComponent(ctx: ComponentValidationContext<'Lommebok'>): AnyValidation[] {
    return validateLommebokForNode(ctx);
  }

  renderLayoutValidators(props: ComponentLayoutValidationProps<'Lommebok'>): JSX.Element | null {
    return <LommebokValidator {...props} />;
  }
}
