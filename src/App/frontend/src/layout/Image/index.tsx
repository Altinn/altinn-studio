import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { ImageDef } from 'src/layout/Image/config.def.generated';
import { ImageComponent } from 'src/layout/Image/ImageComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Image extends ImageDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Image'>>(
    function LayoutComponentImageRender(props, _): JSX.Element | null {
      return <ImageComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <ImageComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <ImageComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
