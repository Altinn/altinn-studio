import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { VideoDef } from 'src/layout/Video/config.def.generated';
import { VideoComponent } from 'src/layout/Video/Video';
import type { PropsFromGenericComponent } from 'src/layout';

export class Video extends VideoDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Video'>>(
    function LayoutComponentImageRender(props, _): JSX.Element | null {
      return <VideoComponent {...props} />;
    },
  );
}
