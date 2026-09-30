import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { HeadingDef } from 'src/layout/Heading/config.def.generated';
import { HeadingComponent } from 'src/layout/Heading/HeadingComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Heading extends HeadingDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Heading'>>(
    function LayoutComponentHeadingRender(props, _): JSX.Element | null {
      return <HeadingComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={props.targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <HeadingComponent
          baseComponentId={props.targetBaseComponentId}
          containerDivRef={React.createRef()}
        />
      </SummaryFlex>
    );
  }
}
