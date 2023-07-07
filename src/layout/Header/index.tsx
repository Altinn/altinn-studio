import React from 'react';

import { HeaderComponent } from 'src/layout/Header/HeaderComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompHeader } from 'src/layout/Header/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Header extends PresentationComponent<'Header'> {
  render(props: PropsFromGenericComponent<'Header'>): JSX.Element | null {
    return <HeaderComponent {...props} />;
  }
}

export const Config = {
  def: new Header(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutCompHeader;
  nodeItem: ExprResolved<ILayoutCompHeader>;
  nodeObj: LayoutNode;
  validTextResourceBindings: 'title' | 'help';
  validDataModelBindings: undefined;
};
