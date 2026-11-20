import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AudioComponent } from 'src/layout/Audio/AudioComponent';
import { AudioDef } from 'src/layout/Audio/config.def.generated';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Audio extends AudioDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Audio'>>(
    function LayoutComponentImageRender(props, _): JSX.Element | null {
      return <AudioComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <AudioComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <AudioComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
