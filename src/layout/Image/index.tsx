import React from 'react';

import { ImageComponent } from 'src/layout/Image/ImageComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Image extends LayoutComponent<'Image'> {
  render(props: PropsFromGenericComponent<'Image'>): JSX.Element | null {
    return <ImageComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
