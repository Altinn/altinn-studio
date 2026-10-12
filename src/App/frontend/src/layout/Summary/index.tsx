import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { SummaryDef } from 'src/layout/Summary/config.def.generated';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { ValidateSummary } from 'src/layout/Summary/ValidateSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export class Summary extends SummaryDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Summary'>>(
    function LayoutComponentSummaryRender(props, _): JSX.Element | null {
      return (
        <SummaryComponent
          summaryBaseId={props.baseComponentId}
          ref={props.containerDivRef}
        />
      );
    },
  );

  shouldRenderInAutomaticPDF() {
    return false;
  }

  renderLayoutValidators(props: ComponentLayoutValidationProps<'Summary'>): React.JSX.Element | null {
    return <ValidateSummary {...props} />;
  }
}
