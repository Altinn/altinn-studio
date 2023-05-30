import React from 'react';

import { IFrameComponent } from 'src/layout/IFrame/IFrameComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IFrameComponentProps } from 'src/layout/IFrame/IFrameComponent';
import type { ILayoutCompIFrame } from 'src/layout/IFrame/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class IFrame extends PresentationComponent<'IFrame'> {
  render(props: IFrameComponentProps): JSX.Element | null {
    return <IFrameComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}

export const Config = {
  def: new IFrame(),
};

export type TypeConfig = {
  layout: ILayoutCompIFrame;
  nodeItem: ExprResolved<ILayoutCompIFrame>;
  nodeObj: LayoutNode;
};
