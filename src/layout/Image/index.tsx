import React from 'react';

import { ImageComponent } from 'src/layout/Image/ImageComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Image extends PresentationComponent<'Image'> {
  render(props: PropsFromGenericComponent<'Image'>): JSX.Element | null {
    return <ImageComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
