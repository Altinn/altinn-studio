import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { PrintButtonComponent } from 'src/layout/PrintButton/PrintButtonComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompPrintButton } from 'src/layout/PrintButton/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class PrintButton extends ActionComponent<'PrintButton'> {
  render(props: PropsFromGenericComponent<'PrintButton'>): JSX.Element | null {
    return <PrintButtonComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }
}

export const Config = {
  def: new PrintButton(),
};

export type TypeConfig = {
  layout: ILayoutCompPrintButton;
  nodeItem: ExprResolved<ILayoutCompPrintButton>;
  nodeObj: LayoutNode;
};
