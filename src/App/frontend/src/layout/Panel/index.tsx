import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { PanelDef } from 'src/layout/Panel/config.def.generated';
import { PanelComponent } from 'src/layout/Panel/PanelComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Panel extends PanelDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Panel'>>(
    function LayoutComponentPanelRender(props, _): JSX.Element | null {
      return <PanelComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <PanelComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <PanelComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
