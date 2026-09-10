import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { KiAssistentComponent } from 'src/layout/KiAssistent/KiAssistentComponent';
import { KiAssistentDef } from 'src/layout/KiAssistent/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class KiAssistent extends KiAssistentDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'KiAssistent'>>(
    function LayoutComponentKiAssistentRender(props, _): JSX.Element | null {
      return <KiAssistentComponent {...props} />;
    },
  );

  useDisplayData(): string {
    return '';
  }

  renderSummary(): JSX.Element | null {
    return null;
  }
}
