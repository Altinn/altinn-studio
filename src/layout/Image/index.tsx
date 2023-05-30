import React from 'react';

import { ImageComponent } from 'src/layout/Image/ImageComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompImage } from 'src/layout/Image/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Image extends PresentationComponent<'Image'> {
  render(props: PropsFromGenericComponent<'Image'>): JSX.Element | null {
    return <ImageComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}

export const Config = {
  def: new Image(),
};

export type TypeConfig = {
  layout: ILayoutCompImage;
  nodeItem: ExprResolved<ILayoutCompImage>;
  nodeObj: LayoutNode;
};
