import React from 'react';

import { getOptionList } from 'src/hooks/useOptionList';
import { getSelectedValueToText } from 'src/hooks/useSelectedValueToText';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { ExprResolved } from 'src/features/expressions/types';
import type { DisplayDataProps, PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompDropdown } from 'src/layout/Dropdown/types';
import type { IDataModelBindingsSimple, TextBindingsForFormComponents } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Dropdown extends FormComponent<'Dropdown'> {
  render(props: PropsFromGenericComponent<'Dropdown'>): JSX.Element | null {
    return <DropdownComponent {...props} />;
  }

  getDisplayData(
    node: LayoutNodeFromType<'Dropdown'>,
    { formData, langTools, options, uiConfig }: DisplayDataProps,
  ): string {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    const value = formData[node.item.dataModelBindings.simpleBinding] || '';
    const optionList = getOptionList(node.item, langTools.textResources, formData, uiConfig.repeatingGroups, options);
    return getSelectedValueToText(value, langTools, optionList) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Dropdown'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }
}

export const Config = {
  def: new Dropdown(),
  rendersWithLabel: true as const,
};

export type TypeConfig = {
  layout: ILayoutCompDropdown;
  nodeItem: ExprResolved<ILayoutCompDropdown>;
  nodeObj: LayoutNode;
  validTextResourceBindings: TextBindingsForFormComponents;
  validDataModelBindings: IDataModelBindingsSimple;
};
