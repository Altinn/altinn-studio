import React from 'react';

import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompCustom } from 'src/layout/Custom/types';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Custom extends FormComponent<'Custom'> {
  render(props: PropsFromGenericComponent<'Custom'>): JSX.Element | null {
    return <CustomWebComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  useDisplayData(node: LayoutNodeFromType<'Custom'>): string {
    const data = node.getFormData();
    return Object.values(data).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Custom'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  canRenderInTable(): boolean {
    return true;
  }
}

export const Config = {
  def: new Custom(),
};

export type TypeConfig = {
  layout: ILayoutCompCustom;
  nodeItem: ExprResolved<ILayoutCompCustom>;
  nodeObj: LayoutNode;
};
