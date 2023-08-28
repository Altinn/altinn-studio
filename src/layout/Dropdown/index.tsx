import React from 'react';

import { getOptionList } from 'src/hooks/useOptionList';
import { getSelectedValueToText } from 'src/hooks/useSelectedValueToText';
import { DropdownDef } from 'src/layout/Dropdown/config.def.generated';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { DisplayDataProps, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Dropdown extends DropdownDef {
  render(props: PropsFromGenericComponent<'Dropdown'>): JSX.Element | null {
    return <DropdownComponent {...props} />;
  }

  getDisplayData(node: LayoutNode<'Dropdown'>, { formData, langTools, options, uiConfig }: DisplayDataProps): string {
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
