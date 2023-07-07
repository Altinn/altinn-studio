import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useCommaSeparatedOptionsToText } from 'src/hooks/useCommaSeparatedOptionsToText';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { FormComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompCheckboxes } from 'src/layout/Checkboxes/types';
import type { IDataModelBindingsSimple, TextBindingsForFormComponents, TextBindingsForLabel } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Checkboxes extends FormComponent<'Checkboxes'> {
  render(props: PropsFromGenericComponent<'Checkboxes'>): JSX.Element | null {
    return <CheckboxContainerComponent {...props} />;
  }

  private useSummaryData(node: LayoutNodeFromType<'Checkboxes'>): { [key: string]: string } {
    const formData = useAppSelector((state) => state.formData.formData);
    const value = node.item.dataModelBindings?.simpleBinding
      ? formData[node.item.dataModelBindings.simpleBinding] || ''
      : '';
    return useCommaSeparatedOptionsToText(node.item, value);
  }

  useDisplayData(node: LayoutNodeFromType<'Checkboxes'>): string {
    return Object.values(this.useSummaryData(node)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Checkboxes'>): JSX.Element | null {
    const formData = this.useSummaryData(targetNode);
    return <MultipleChoiceSummary formData={formData} />;
  }
}

export const Config = {
  def: new Checkboxes(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutCompCheckboxes;
  nodeItem: ExprResolved<ILayoutCompCheckboxes>;
  nodeObj: LayoutNode;
  // We don't render the label in GenericComponent, but we still need the
  // text resource bindings for rendering them on our own
  validTextResourceBindings: TextBindingsForLabel | TextBindingsForFormComponents;
  validDataModelBindings: IDataModelBindingsSimple;
};
