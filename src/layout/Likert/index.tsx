import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useSelectedValueToText } from 'src/hooks/useSelectedValueToText';
import { FormComponent } from 'src/layout/LayoutComponent';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { LayoutStyle } from 'src/types';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsSimple } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ILayoutCompLikert } from 'src/layout/Likert/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Likert extends FormComponent<'Likert'> {
  render(props: PropsFromGenericComponent<'Likert'>): JSX.Element | null {
    return <LikertComponent {...props} />;
  }

  directRender(props: PropsFromGenericComponent<'Likert'>): boolean {
    return props.node.item.layout === LayoutStyle.Table || props.overrideItemProps?.layout === LayoutStyle.Table;
  }

  useDisplayData(node: LayoutNodeFromType<'Likert'>): string {
    const formData = useAppSelector((state) => state.formData.formData);
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    const value = formData[node.item.dataModelBindings.simpleBinding] || '';
    return useSelectedValueToText(node.item, value) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Likert'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new Likert(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutCompLikert;
  nodeItem: ExprResolved<ILayoutCompLikert>;
  nodeObj: LayoutNode;
  // TODO: description/help only works on mobile, as it uses the ControlledRadioGroup component
  // Ideally, it should be possible to use it on desktop as well, or the mobile mode should also not display
  // anything here. Fixing this requires some refactoring.
  validTextResourceBindings: 'title' | 'description' | 'help';
  validDataModelBindings: IDataModelBindingsSimple;
};
