import React from 'react';

import { FormComponent } from 'src/layout/LayoutComponent';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { MapComponentSummary } from 'src/layout/Map/MapComponentSummary';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsSimple } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ILayoutCompMap } from 'src/layout/Map/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Map extends FormComponent<'Map'> {
  render(props: PropsFromGenericComponent<'Map'>): JSX.Element | null {
    return <MapComponent {...props} />;
  }

  getDisplayData(node: LayoutNodeFromType<'Map'>, { formData }): string {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    return formData[node.item.dataModelBindings.simpleBinding] || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Map'>): JSX.Element | null {
    return <MapComponentSummary targetNode={targetNode} />;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new Map(),
  rendersWithLabel: true as const,
};

export type TypeConfig = {
  layout: ILayoutCompMap;
  nodeItem: ExprResolved<ILayoutCompMap>;
  nodeObj: LayoutNode;
  validTextResourceBindings: undefined;
  validDataModelBindings: IDataModelBindingsSimple;
};
