import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getCommaSeparatedOptionsToText } from 'src/hooks/useCommaSeparatedOptionsToText';
import { type IUseLanguage, useLanguage } from 'src/hooks/useLanguage';
import { getOptionList } from 'src/hooks/useOptionList';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { FormComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { DisplayDataProps, PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompCheckboxes } from 'src/layout/Checkboxes/types';
import type { IDataModelBindingsSimple, TextBindingsForFormComponents, TextBindingsForLabel } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { IOptions, IRepeatingGroups } from 'src/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Checkboxes extends FormComponent<'Checkboxes'> {
  render(props: PropsFromGenericComponent<'Checkboxes'>): JSX.Element | null {
    return <CheckboxContainerComponent {...props} />;
  }

  private getSummaryData(
    node: LayoutNodeFromType<'Checkboxes'>,
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

  getDisplayData(
    node: LayoutNodeFromType<'Checkboxes'>,
    { formData, langTools, uiConfig, options }: DisplayDataProps,
  ): string {
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
