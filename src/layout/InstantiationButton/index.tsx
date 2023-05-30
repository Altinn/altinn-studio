import React from 'react';

import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompInstantiationButton } from 'src/layout/InstantiationButton/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class InstantiationButton extends ActionComponent<'InstantiationButton'> {
  render(props: PropsFromGenericComponent<'InstantiationButton'>): JSX.Element | null {
    return <InstantiationButtonComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }
}

export const Config = {
  def: new InstantiationButton(),
};

export type TypeConfig = {
  layout: ILayoutCompInstantiationButton;
  nodeItem: ExprResolved<ILayoutCompInstantiationButton>;
  nodeObj: LayoutNode;
};
