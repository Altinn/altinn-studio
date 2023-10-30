import React from 'react';
import type { JSX } from 'react';

import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useAllOptions } from 'src/features/options/useAllOptions';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { type IUseLanguage, useLanguage } from 'src/hooks/useLanguage';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { MultipleSelectDef } from 'src/layout/MultipleSelect/config.def.generated';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { IFormData } from 'src/features/formData';
import type { AllOptionsMap } from 'src/features/options/useAllOptions';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class MultipleSelect extends MultipleSelectDef {
  render(props: PropsFromGenericComponent<'MultipleSelect'>): JSX.Element | null {
    return <MultipleSelectComponent {...props} />;
  }

  private getSummaryData(
    node: LayoutNode<'MultipleSelect'>,
    formData: IFormData,
    langTools: IUseLanguage,
    options: AllOptionsMap,
  ): { [key: string]: string } {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return {};
    }

    const value = formData[node.item.dataModelBindings.simpleBinding] || '';
    const optionList = options[node.item.id] || [];
    return getCommaSeparatedOptionsToText(value, optionList, langTools);
  }

  getDisplayData(node: LayoutNode<'MultipleSelect'>, { formData, langTools, options }): string {
    return Object.values(this.getSummaryData(node, formData, langTools, options)).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'MultipleSelect'>): JSX.Element | null {
    const formData = useAppSelector((state) => state.formData.formData);
    const langTools = useLanguage();
    const options = useAllOptions();
    const summaryData = this.getSummaryData(targetNode, formData, langTools, options);
    return <MultipleChoiceSummary formData={summaryData} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'MultipleSelect'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
