import React from 'react';

import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { getOptionList } from 'src/features/options/getOptionList';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { type IUseLanguage, useLanguage } from 'src/hooks/useLanguage';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { CheckboxesDef } from 'src/layout/Checkboxes/config.def.generated';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import type { IFormData } from 'src/features/formData';
import type { DisplayDataProps, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { IOptions, IRepeatingGroups } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Checkboxes extends CheckboxesDef {
  render(props: PropsFromGenericComponent<'Checkboxes'>): JSX.Element | null {
    return <CheckboxContainerComponent {...props} />;
  }

  private getSummaryData(
    node: LayoutNode<'Checkboxes'>,
    formData: IFormData,
    langTools: IUseLanguage,
    repeatingGroups: IRepeatingGroups | null,
    options: IOptions,
  ): { [key: string]: string } {
    const value = node.item.dataModelBindings?.simpleBinding
      ? formData[node.item.dataModelBindings.simpleBinding] || ''
      : '';
    const optionList = getOptionList(node.item, langTools.textResources, formData, repeatingGroups, options);
    return getCommaSeparatedOptionsToText(value, optionList, langTools);
  }

  getDisplayData(node: LayoutNode<'Checkboxes'>, { formData, langTools, uiConfig, options }: DisplayDataProps): string {
    return Object.values(this.getSummaryData(node, formData, langTools, uiConfig.repeatingGroups, options)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Checkboxes'>): JSX.Element | null {
    const formData = useAppSelector((state) => state.formData.formData);
    const langTools = useLanguage();
    const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
    const options = useAppSelector((state) => state.optionState.options);
    const summaryData = this.getSummaryData(targetNode, formData, langTools, repeatingGroups, options);
    return <MultipleChoiceSummary formData={summaryData} />;
  }
}
