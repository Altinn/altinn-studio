import React from 'react';

import { FormComponent } from 'src/layout/LayoutComponent';
import { ListComponent } from 'src/layout/List/ListComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ILayoutCompList } from 'src/layout/List/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class List extends FormComponent<'List'> {
  render(props: PropsFromGenericComponent<'List'>): JSX.Element | null {
    return <ListComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  useDisplayData(node: LayoutNodeFromType<'List'>): string {
    const formData = node.getFormData();
    const dmBindings = node.item.dataModelBindings;
    for (const [key, binding] of Object.entries(dmBindings || {})) {
      if (binding == node.item.bindingToShowInSummary) {
        return formData[key] || '';
      }
    }

    return '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'List'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new List(),
};

export type TypeConfig = {
  layout: ILayoutCompList;
  nodeItem: ExprResolved<ILayoutCompList>;
  nodeObj: LayoutNode;
};
