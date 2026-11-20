import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { InstanceInformationDef } from 'src/layout/InstanceInformation/config.def.generated';
import { InstanceInformationComponent } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class InstanceInformation extends InstanceInformationDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'InstanceInformation'>>(
    function LayoutComponentInstanceInformationRender(props, _): JSX.Element | null {
      return <InstanceInformationComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <InstanceInformationComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <InstanceInformationComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
