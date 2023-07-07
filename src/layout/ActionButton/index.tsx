import React from 'react';

import { ActionButtonComponent } from 'src/layout/ActionButton/ActionButtonComponent';
import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompActionButton } from 'src/layout/ActionButton/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class ActionButton extends ActionComponent<'ActionButton'> {
  render(props: PropsFromGenericComponent<'ActionButton'>): JSX.Element | null {
    return <ActionButtonComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }
}

export const Config = {
  def: new ActionButton(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutCompActionButton;
  nodeItem: ExprResolved<ILayoutCompActionButton>;
  nodeObj: LayoutNode;
  validTextResourceBindings: 'title';
  validDataModelBindings: undefined;
};
