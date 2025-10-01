import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { SummaryDef } from 'src/layout/Summary/config.def.generated';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { ValidateSummary } from 'src/layout/Summary/ValidateSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';

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

  renderSummary(): JSX.Element | null {
    // If the code ever ends up with a Summary component referencing another Summary component, we should not end up
    // in an infinite loop by rendering them all. This is usually stopped early in <SummaryComponent />.
    return null;
  }

  shouldRenderInAutomaticPDF() {
    return false;
  }

  renderLayoutValidators(props: NodeValidationProps<'Summary'>): React.JSX.Element | null {
    return <ValidateSummary {...props} />;
  }
}
