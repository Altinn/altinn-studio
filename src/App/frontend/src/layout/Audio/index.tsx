import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AudioComponent } from 'src/layout/Audio/Audio';
import { AudioDef } from 'src/layout/Audio/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class Audio extends AudioDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Audio'>>(
    function LayoutComponentImageRender(props, _): JSX.Element | null {
      return <AudioComponent {...props} />;
    },
  );
}
