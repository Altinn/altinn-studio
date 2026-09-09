import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { LommebokDef } from 'src/layout/Lommebok/config.def.generated';
import { LommebokComponent } from 'src/layout/Lommebok/LommebokComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export class Lommebok extends LommebokDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Lommebok'>>(
    function LayoutComponentLommebokRender(props, _): JSX.Element | null {
      return <LommebokComponent {...props} />;
    },
  );

  renderSummary(_props: SummaryRendererProps): JSX.Element | null {
    return null;
  }
}
