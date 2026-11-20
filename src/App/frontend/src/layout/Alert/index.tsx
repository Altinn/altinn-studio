import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Alert as AlertComponent } from 'src/layout/Alert/Alert';
import { AlertDef } from 'src/layout/Alert/config.def.generated';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Alert extends AlertDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Alert'>>(
    function LayoutComponentAlertRender(props, _): JSX.Element | null {
      return <AlertComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <AlertComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <AlertComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
