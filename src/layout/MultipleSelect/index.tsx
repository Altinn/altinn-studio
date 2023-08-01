import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getCommaSeparatedOptionsToText } from 'src/hooks/useCommaSeparatedOptionsToText';
import { type IUseLanguage, useLanguage } from 'src/hooks/useLanguage';
import { getOptionList } from 'src/hooks/useOptionList';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { FormComponent } from 'src/layout/LayoutComponent';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsSimple, TextBindingsForFormComponents } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ILayoutCompMultipleSelect } from 'src/layout/MultipleSelect/types';
import type { IOptions, IRepeatingGroups } from 'src/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class MultipleSelect extends FormComponent<'MultipleSelect'> {
  render(props: PropsFromGenericComponent<'MultipleSelect'>): JSX.Element | null {
    return <MultipleSelectComponent {...props} />;
  }

  private getSummaryData(
    node: LayoutNodeFromType<'MultipleSelect'>,
    formData: IFormData,
    langTools: IUseLanguage,
    repeatingGroups: IRepeatingGroups | null,
    options: IOptions,
  ): { [key: string]: string } {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return {};
    }

    const value = formData[node.item.dataModelBindings.simpleBinding] || '';
    const optionList = getOptionList(node.item, langTools.textResources, formData, repeatingGroups, options);
    return getCommaSeparatedOptionsToText(value, optionList, langTools);
  }

  getDisplayData(node: LayoutNodeFromType<'MultipleSelect'>, { formData, langTools, uiConfig, options }): string {
    return Object.values(this.getSummaryData(node, formData, langTools, uiConfig.repeatingGroups, options)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'MultipleSelect'>): JSX.Element | null {
    const formData = useAppSelector((state) => state.formData.formData);
    const langTools = useLanguage();
    const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
    const options = useAppSelector((state) => state.optionState.options);
    const summaryData = this.getSummaryData(targetNode, formData, langTools, repeatingGroups, options);
    return <MultipleChoiceSummary formData={summaryData} />;
  }
}

export const Config = {
  def: new MultipleSelect(),
  rendersWithLabel: true as const,
};

export type TypeConfig = {
  layout: ILayoutCompMultipleSelect;
  nodeItem: ExprResolved<ILayoutCompMultipleSelect>;
  nodeObj: LayoutNode;
  validTextResourceBindings: TextBindingsForFormComponents;
  validDataModelBindings: IDataModelBindingsSimple;
};
