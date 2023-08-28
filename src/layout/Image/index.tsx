import React from 'react';

import { ImageDef } from 'src/layout/Image/config.def.generated';
import { ImageComponent } from 'src/layout/Image/ImageComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Image extends ImageDef {
  render(props: PropsFromGenericComponent<'Image'>): JSX.Element | null {
    return <ImageComponent {...props} />;
  }
}
