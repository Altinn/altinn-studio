import React from 'react';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompNavBar } from 'src/layout/NavigationBar/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class NavigationBar extends ActionComponent<'NavigationBar'> {
  render(props: PropsFromGenericComponent<'NavigationBar'>): JSX.Element | null {
    return <NavigationBarComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new NavigationBar(),
};

export type TypeConfig = {
  layout: ILayoutCompNavBar;
  nodeItem: ExprResolved<ILayoutCompNavBar>;
  nodeObj: LayoutNode;
};
