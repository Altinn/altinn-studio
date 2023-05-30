import React from 'react';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompNavButtons } from 'src/layout/NavigationButtons/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class NavigationButtons extends ActionComponent<'NavigationButtons'> {
  render(props: PropsFromGenericComponent<'NavigationButtons'>): JSX.Element | null {
    return <NavigationButtonsComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new NavigationButtons(),
};

export type TypeConfig = {
  layout: ILayoutCompNavButtons;
  nodeItem: ExprResolved<ILayoutCompNavButtons>;
  nodeObj: LayoutNode;
};
