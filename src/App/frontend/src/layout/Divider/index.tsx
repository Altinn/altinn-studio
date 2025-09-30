import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { DividerDef } from 'src/layout/Divider/config.def.generated';
import { DividerComponent } from 'src/layout/Divider/DividerComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Divider extends DividerDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Divider'>>(
    function LayoutComponentDividerRender(props, _): JSX.Element | null {
      return <DividerComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={props.targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <DividerComponent
          baseComponentId={props.targetBaseComponentId}
          containerDivRef={React.createRef()}
        />
      </SummaryFlex>
    );
  }
}
