import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { LinkComponent } from 'src/layout/Link/LinkComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompLink } from 'src/layout/Link/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Link extends ActionComponent<'Link'> {
  render(props: PropsFromGenericComponent<'Link'>): JSX.Element | null {
    return <LinkComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }
}

export const Config = {
  def: new Link(),
};

export type TypeConfig = {
  layout: ILayoutCompLink;
  nodeItem: ExprResolved<ILayoutCompLink>;
  nodeObj: LayoutNode;
};
