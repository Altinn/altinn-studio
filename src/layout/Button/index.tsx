import React from 'react';

import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompButton } from 'src/layout/Button/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Button extends ActionComponent<'Button'> {
  render(props: PropsFromGenericComponent<'Button'>): JSX.Element | null {
    return <ButtonComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }
}

export const Config = {
  def: new Button(),
};

export type TypeConfig = {
  layout: ILayoutCompButton;
  nodeItem: ExprResolved<ILayoutCompButton>;
  nodeObj: LayoutNode;
};
