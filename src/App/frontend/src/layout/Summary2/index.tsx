import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Summary2Def } from 'src/layout/Summary2/config.def.generated';
import { Summary2LayoutValidator } from 'src/layout/Summary2/SummaryComponent2/LayoutValidator';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export class Summary2 extends Summary2Def {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Summary2'>>(
    function LayoutComponentSummaryRender(props, _): JSX.Element | null {
      return <SummaryComponent2 {...props} />;
    },
  );

  shouldRenderInAutomaticPDF() {
    return true;
  }

  renderLayoutValidators(props: ComponentLayoutValidationProps<'Summary2'>): React.JSX.Element | null {
    return <Summary2LayoutValidator {...props} />;
  }
}
