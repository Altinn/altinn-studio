import React from 'react';

import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompAddress } from 'src/layout/Address/types';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Address extends FormComponent<'AddressComponent'> {
  render(props: PropsFromGenericComponent<'AddressComponent'>): JSX.Element | null {
    return <AddressComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  useDisplayData(node: LayoutNodeFromType<'AddressComponent'>): string {
    const data = node.getFormData();
    return Object.values(data).join(' ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'AddressComponent'>): JSX.Element | null {
    const data = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={data} />;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new Address(),
};

export type TypeConfig = {
  layout: ILayoutCompAddress;
  nodeItem: ExprResolved<ILayoutCompAddress>;
  nodeObj: LayoutNode;
};
