import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { VideoDef } from 'src/layout/Video/config.def.generated';
import { VideoComponent } from 'src/layout/Video/VideoComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Video extends VideoDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Video'>>(
    function LayoutComponentVideoRender(props, _): JSX.Element | null {
      return <VideoComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <VideoComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <VideoComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
